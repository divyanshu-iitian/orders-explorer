import { describe, expect, it } from 'vitest'
import { normalizeOrders } from './normalize'

const v2 = {
  id: 'ORD-0000001',
  schemaVersion: 2,
  customerName: 'Priya Gupta',
  customerEmail: 'priya@example.com',
  status: 'delivered',
  amount: 309.53,
  currency: 'INR',
  createdAt: '2026-03-09T00:44:53.000Z',
  updatedAt: null,
  region: 'EAST',
  channel: 'store',
  priority: 3,
  paymentMethod: 'netbanking',
  itemCount: 1,
  notes: null,
}

const one = (overrides: Record<string, unknown>) => normalizeOrders([{ ...v2, ...overrides }]).orders[0]

describe('normalizeOrders', () => {
  it('merges customer_name and customerName into one field', () => {
    const { orders } = normalizeOrders([
      v2,
      { ...v2, id: 'ORD-0000002', schemaVersion: 1, customerName: undefined, customer_name: 'Amit Sharma' },
    ])
    expect(orders.map((o) => o.customer)).toEqual(['Priya Gupta', 'Amit Sharma'])
  })

  it('converts v1 paise to rupees and leaves v2 rupees alone', () => {
    expect(one({ schemaVersion: 1, amount: 30780 }).amount).toBe(307.8)
    expect(one({ schemaVersion: 2, amount: 307.8 }).amount).toBe(307.8)
  })

  it('reads string amounts as numbers, in the right unit', () => {
    expect(one({ amount: '4599.5' }).amount).toBe(4599.5)
    expect(one({ schemaVersion: 1, amount: '459950' }).amount).toBe(4599.5)
    expect(one({ amount: 'n/a' }).amount).toBeNull()
  })

  it('reads all four createdAt formats to the same instant', () => {
    const instant = Date.UTC(2025, 2, 14, 9, 30)
    expect(one({ createdAt: '2025-03-14T09:30:00.000Z' }).createdAt).toBe(instant)
    expect(one({ createdAt: '2025-03-14T09:30:00' }).createdAt).toBe(instant)
    expect(one({ createdAt: 1741944600 }).createdAt).toBe(instant)
    expect(one({ createdAt: '14/03/2025' }).createdAt).toBe(Date.UTC(2025, 2, 14))
  })

  it('treats null and missing updatedAt the same', () => {
    const { updatedAt: _omit, ...missing } = v2
    expect(normalizeOrders([missing]).orders[0].updatedAt).toBeNull()
    expect(one({ updatedAt: null }).updatedAt).toBeNull()
  })

  it('folds status and region casing into one value', () => {
    expect(['Shipped', 'SHIPPED', ' shipped '].map((status) => one({ status }).status)).toEqual([
      'shipped',
      'shipped',
      'shipped',
    ])
    expect(one({ region: 'south' }).region).toBe('SOUTH')
    expect(one({ region: 'NorthEast' }).region).toBe('NORTHEAST')
  })

  it('counts values it does not recognise instead of inventing one', () => {
    const { orders, report } = normalizeOrders([{ ...v2, status: 'lost-in-transit' }])
    expect(orders[0].status).toBeNull()
    expect(report.unknownValues).toBe(1)
  })

  it('keeps missing priority as null', () => {
    const { priority: _omit, ...missing } = v2
    expect(normalizeOrders([missing]).orders[0].priority).toBeNull()
    expect(one({ priority: 7 }).priority).toBeNull()
  })

  it('keeps notes as raw text and turns null into an empty string', () => {
    expect(one({ notes: '<b>URGENT</b> <script>alert(1)</script>' }).notes).toBe(
      '<b>URGENT</b> <script>alert(1)</script>',
    )
    expect(one({ notes: null }).notes).toBe('')
  })

  it('trims the currency', () => {
    expect(one({ currency: 'INR ' }).currency).toBe('INR')
  })

  it('skips entries without an id', () => {
    const { orders, report } = normalizeOrders([v2, null, 42, { ...v2, id: '  ' }])
    expect(orders).toHaveLength(1)
    expect(report.skipped).toBe(3)
  })

  describe('duplicate ids', () => {
    const dup = (a: Record<string, unknown>, b: Record<string, unknown>) =>
      normalizeOrders([
        { ...v2, ...a, notes: 'first' },
        { ...v2, id: 'ORD-0000009' },
        { ...v2, ...b, notes: 'second' },
      ])

    it('keeps the later updatedAt when both have one', () => {
      const { orders, report } = dup(
        { updatedAt: '2024-06-23T01:53:41.000Z' },
        { updatedAt: '2024-06-02T06:54:46.000Z' },
      )
      expect(orders).toHaveLength(2)
      expect(orders[0].notes).toBe('first')
      expect(report.duplicatesRemoved).toBe(1)
    })

    it('keeps the one that has updatedAt when only one does', () => {
      expect(dup({ updatedAt: '2024-06-02T00:00:00Z' }, { updatedAt: null }).orders[0].notes).toBe('first')
      expect(dup({ updatedAt: null }, { updatedAt: '2024-06-02T00:00:00Z' }).orders[0].notes).toBe('second')
    })

    it('keeps the later record when neither has updatedAt', () => {
      expect(dup({ updatedAt: null }, { updatedAt: null }).orders[0].notes).toBe('second')
    })

    it('keeps the kept record in the position of the first one', () => {
      const ids = dup({ updatedAt: null }, { updatedAt: null }).orders.map((o) => o.id)
      expect(ids).toEqual(['ORD-0000001', 'ORD-0000009'])
    })
  })
})
