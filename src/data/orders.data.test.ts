import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeOrders } from './normalize'
import { STATUSES } from './types'

// Runs the cleaner over the real export, to catch anything the hand-written
// fixtures in normalize.test.ts do not cover.
const raw = JSON.parse(readFileSync(new URL('../../public/orders.json', import.meta.url), 'utf8')) as unknown[]
const { orders, report } = normalizeOrders(raw)

describe('orders.json after cleaning', () => {
  it('has one row per id', () => {
    expect(report.read).toBe(50_030)
    expect(report.duplicatesRemoved).toBe(30)
    expect(orders).toHaveLength(50_000)
    expect(new Set(orders.map((o) => o.id)).size).toBe(50_000)
  })

  it('leaves nothing unreadable', () => {
    expect(report.skipped).toBe(0)
    expect(report.unknownValues).toBe(0)
    expect(report.unreadableDates).toBe(0)
    expect(orders.every((o) => o.createdAt !== null)).toBe(true)
    expect(orders.every((o) => o.amount !== null && o.amount > 0)).toBe(true)
    expect(orders.every((o) => o.customer !== '')).toBe(true)
  })

  it('has exactly five statuses and one currency', () => {
    expect(new Set(orders.map((o) => o.status))).toEqual(new Set(STATUSES))
    expect(new Set(orders.map((o) => o.currency))).toEqual(new Set(['INR']))
  })

  it('puts every amount in rupees', () => {
    // v1 records are in paise; left unconverted they would be ~100x larger.
    const max = Math.max(...orders.map((o) => o.amount ?? 0))
    expect(max).toBeLessThan(10_000)
  })
})
