import { describe, expect, it } from 'vitest'
import type { Order } from '../data/types'
import { csvCell, exportFileName, ordersToCsv } from './csv'

const order: Order = {
  id: 'ORD-0000001',
  schemaVersion: 1,
  customer: 'Priya Gupta',
  email: 'priya@example.com',
  status: 'delivered',
  amount: 1234.5,
  currency: 'INR',
  createdAt: Date.UTC(2025, 2, 14, 9, 30),
  updatedAt: null,
  region: 'NORTHEAST',
  channel: 'web',
  priority: null,
  paymentMethod: 'cod',
  itemCount: 3,
  notes: '<b>URGENT</b> says "call", then\nleave at door',
}

describe('ordersToCsv', () => {
  it('writes a header and one line per order', () => {
    const lines = ordersToCsv([order, order]).split('\r\n')
    expect(lines[0]).toBe(
      'Order ID,Customer,Email,Status,Amount,Currency,Items,Priority,Region,Channel,Payment,Created (UTC),Updated (UTC),Notes',
    )
    expect(
      lines[1].startsWith('ORD-0000001,Priya Gupta,priya@example.com,Delivered,1234.50,INR,3,None,Northeast'),
    ).toBe(true)
    expect(lines[1]).toContain(',2025-03-14T09:30:00Z,,')
  })

  it('quotes notes with quotes, commas and line breaks', () => {
    expect(ordersToCsv([order])).toContain('"<b>URGENT</b> says ""call"", then\nleave at door"')
  })

  it('writes only the header for no orders', () => {
    expect(ordersToCsv([])).toBe(
      'Order ID,Customer,Email,Status,Amount,Currency,Items,Priority,Region,Channel,Payment,Created (UTC),Updated (UTC),Notes\r\n',
    )
  })
})

describe('csvCell', () => {
  it('neutralises formulas in free text only', () => {
    expect(csvCell('=HYPERLINK("x")', true)).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@SUM(A1)', true)).toBe("'@SUM(A1)")
    expect(csvCell('-5', false)).toBe('-5')
  })

  it('leaves plain values alone', () => {
    expect(csvCell('Delivered')).toBe('Delivered')
    expect(csvCell(42)).toBe('42')
    expect(csvCell(null)).toBe('')
  })
})

describe('exportFileName', () => {
  it('includes the time and row count', () => {
    expect(exportFileName(20, new Date(2026, 9, 26, 9, 5))).toBe('orders-20261026-0905-20.csv')
  })
})
