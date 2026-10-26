import { describe, expect, it } from 'vitest'
import { buildOrderIndex } from '../data/orderIndex'
import type { Order } from '../data/types'
import { nextSort, sortPositions } from './sort'

const base: Order = {
  id: 'ORD-0000001',
  schemaVersion: 2,
  customer: 'A',
  email: 'a@example.com',
  status: 'pending',
  amount: 100,
  currency: 'INR',
  createdAt: 0,
  updatedAt: null,
  region: 'NORTH',
  channel: 'web',
  priority: 1,
  paymentMethod: 'upi',
  itemCount: 1,
  notes: '',
}

const make = (rows: Partial<Order>[]) => buildOrderIndex(rows.map((r, i) => ({ ...base, id: `ORD-${i}`, ...r })))
const sorted = (rows: Partial<Order>[], key: keyof Order, direction: 'asc' | 'desc' = 'asc') =>
  Array.from(sortPositions(make(rows), { key: key as never, direction }))

describe('sortPositions', () => {
  it('sorts amounts as numbers, not as text', () => {
    expect(sorted([{ amount: 900 }, { amount: 1000 }, { amount: 95 }], 'amount')).toEqual([2, 0, 1])
  })

  it('sorts dates by time, whatever format they came in', () => {
    const rows = [{ createdAt: Date.UTC(2025, 0, 2) }, { createdAt: Date.UTC(2024, 11, 31) }]
    expect(sorted(rows, 'createdAt')).toEqual([1, 0])
    expect(sorted(rows, 'createdAt', 'desc')).toEqual([0, 1])
  })

  it('sorts text case-insensitively', () => {
    expect(sorted([{ customer: 'bob' }, { customer: 'Alice' }, { customer: 'carol' }], 'customer')).toEqual([1, 0, 2])
  })

  it('puts missing updatedAt last in both directions', () => {
    const rows = [{ updatedAt: null }, { updatedAt: 5 }, { updatedAt: null }, { updatedAt: 9 }]
    expect(sorted(rows, 'updatedAt', 'asc')).toEqual([1, 3, 0, 2])
    expect(sorted(rows, 'updatedAt', 'desc')).toEqual([3, 1, 0, 2])
  })

  it('sorts priority by number with None last', () => {
    expect(sorted([{ priority: null }, { priority: 3 }, { priority: 1 }], 'priority')).toEqual([2, 1, 0])
    expect(sorted([{ priority: null }, { priority: 3 }, { priority: 1 }], 'priority', 'desc')).toEqual([1, 2, 0])
  })

  it('sorts status by its label', () => {
    expect(sorted([{ status: 'shipped' }, { status: 'cancelled' }, { status: 'delivered' }], 'status')).toEqual([
      1, 2, 0,
    ])
  })

  it('keeps file order for ties in both directions', () => {
    const rows = [{ amount: 5 }, { amount: 5 }, { amount: 1 }]
    expect(sorted(rows, 'amount', 'asc')).toEqual([2, 0, 1])
    expect(sorted(rows, 'amount', 'desc')).toEqual([0, 1, 2])
  })
})

describe('nextSort', () => {
  it('cycles ascending, descending, off', () => {
    const asc = nextSort(null, 'amount')
    expect(asc).toEqual({ key: 'amount', direction: 'asc' })
    const desc = nextSort(asc, 'amount')
    expect(desc).toEqual({ key: 'amount', direction: 'desc' })
    expect(nextSort(desc, 'amount')).toBeNull()
  })

  it('starts ascending when switching columns', () => {
    expect(nextSort({ key: 'amount', direction: 'desc' }, 'id')).toEqual({ key: 'id', direction: 'asc' })
  })
})
