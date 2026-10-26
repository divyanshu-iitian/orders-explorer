import { optionLabel } from '../data/fields'
import type { Order } from '../data/types'
import { toIsoUtc } from '../lib/format'

interface CsvColumn {
  header: string
  value: (order: Order) => string | number | null
  /** Free text typed by people: guarded against spreadsheet formula injection. */
  freeText?: boolean
}

// Machine-friendly values: plain numbers in rupees and ISO dates, so the file
// can be re-imported or summed without fighting formatting.
const COLUMNS: readonly CsvColumn[] = [
  { header: 'Order ID', value: (o) => o.id },
  { header: 'Customer', value: (o) => o.customer, freeText: true },
  { header: 'Email', value: (o) => o.email, freeText: true },
  { header: 'Status', value: (o) => optionLabel('status', o.status) },
  { header: 'Amount', value: (o) => (o.amount === null ? null : o.amount.toFixed(2)) },
  { header: 'Currency', value: (o) => o.currency },
  { header: 'Items', value: (o) => o.itemCount },
  { header: 'Priority', value: (o) => (o.priority === null ? 'None' : `P${o.priority}`) },
  { header: 'Region', value: (o) => optionLabel('region', o.region) },
  { header: 'Channel', value: (o) => optionLabel('channel', o.channel) },
  { header: 'Payment', value: (o) => optionLabel('paymentMethod', o.paymentMethod) },
  { header: 'Created (UTC)', value: (o) => toIsoUtc(o.createdAt) },
  { header: 'Updated (UTC)', value: (o) => toIsoUtc(o.updatedAt) },
  { header: 'Notes', value: (o) => o.notes, freeText: true },
]

/** RFC 4180 CSV with CRLF line ends. */
export function ordersToCsv(orders: readonly Order[]): string {
  const lines = [COLUMNS.map((c) => csvCell(c.header)).join(',')]
  for (const order of orders) {
    lines.push(COLUMNS.map((c) => csvCell(c.value(order), c.freeText)).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

export function csvCell(value: string | number | null, freeText = false): string {
  if (value === null) return ''
  let text = String(value)
  // A note starting with "=" or "@" would run as a formula when opened in Excel or Sheets.
  if (freeText && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function exportFileName(count: number, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `orders-${stamp}-${count}.csv`
}

export function downloadCsv(fileName: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8 (names, ₹, notes).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
