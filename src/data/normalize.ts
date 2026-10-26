import { parseTimestamp } from './dates'
import { CHANNELS, PAYMENT_METHODS, REGIONS, STATUSES, type NormalizeReport, type Order, type Priority } from './types'

/**
 * The single place where raw records from orders.json are cleaned up.
 * The numbered comments refer to the "Known problems" list in data-notes.md.
 */
export function normalizeOrders(raw: readonly unknown[]): { orders: Order[]; report: NormalizeReport } {
  const report: NormalizeReport = {
    read: raw.length,
    kept: 0,
    duplicatesRemoved: 0,
    skipped: 0,
    unknownValues: 0,
    unreadableDates: 0,
  }

  const orders: Order[] = []
  const slotById = new Map<string, number>()

  for (const record of raw) {
    const order = normalizeRecord(record, report)
    if (!order) {
      report.skipped++
      continue
    }

    // (7) Duplicate ids: keep one record, in the position of the first one so
    // the default order of the grid stays stable.
    const slot = slotById.get(order.id)
    if (slot === undefined) {
      slotById.set(order.id, orders.length)
      orders.push(order)
    } else {
      report.duplicatesRemoved++
      if (laterRecordWins(orders[slot], order)) orders[slot] = order
    }
  }

  report.kept = orders.length
  return { orders, report }
}

/**
 * (7) Which of two records with the same id to keep. `later` appears after
 * `earlier` in the file.
 * - both have updatedAt: the later updatedAt wins (a tie goes to the later record)
 * - only one has updatedAt: that one wins
 * - neither has it: the later record wins
 */
export function laterRecordWins(earlier: Order, later: Order): boolean {
  if (earlier.updatedAt !== null && later.updatedAt !== null) return later.updatedAt >= earlier.updatedAt
  if (earlier.updatedAt !== null) return false
  return true
}

function normalizeRecord(input: unknown, report: NormalizeReport): Order | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const r = input as Record<string, unknown>

  const id = cleanString(r.id)
  if (!id) return null

  // Older exports may lack schemaVersion; the snake_case name only exists in v1.
  const schemaVersion = r.schemaVersion === 1 || (r.schemaVersion !== 2 && 'customer_name' in r) ? 1 : 2

  const enumValue = <T extends string>(value: unknown, allowed: readonly T[], toCase: (s: string) => string) => {
    const text = cleanString(value)
    if (!text) return null
    // (6) Status and region come in mixed case: compare on one casing.
    const found = allowed.find((option) => option === toCase(text))
    if (!found) report.unknownValues++
    return found ?? null
  }

  const date = (value: unknown) => {
    const ms = parseTimestamp(value)
    if (ms === null && value !== null && value !== undefined && value !== '') report.unreadableDates++
    return ms
  }

  return {
    id,
    schemaVersion,
    // (1) Two names for the same field.
    customer: cleanString(r.customerName ?? r.customer_name),
    email: cleanString(r.customerEmail),
    status: enumValue(r.status, STATUSES, lower),
    amount: toRupees(r.amount, schemaVersion),
    // (10) "INR " with a trailing space.
    currency: cleanString(r.currency).toUpperCase() || 'INR',
    // (4) Four date formats, (5) null and missing updatedAt are the same.
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
    region: enumValue(r.region, REGIONS, upper),
    channel: enumValue(r.channel, CHANNELS, lower),
    // (8) Missing priority is kept as null and shown as "None".
    priority: toPriority(r.priority),
    paymentMethod: enumValue(r.paymentMethod, PAYMENT_METHODS, lower),
    itemCount: toNumber(r.itemCount),
    // (9) Notes stay plain text; rendering escapes them, nothing here touches HTML.
    notes: typeof r.notes === 'string' ? r.notes : '',
  }
}

/** (2) v1 stores paise, v2 stores rupees. (3) Some amounts are strings. */
export function toRupees(value: unknown, schemaVersion: 1 | 2): number | null {
  const n = toNumber(value)
  if (n === null) return null
  const rupees = schemaVersion === 1 ? n / 100 : n
  // Round to whole paise so 0.1 + 0.2 style noise never shows up in sums or filters.
  return Math.round(rupees * 100) / 100
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/,/g, '')
  if (text === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function toPriority(value: unknown): Priority | null {
  const n = toNumber(value)
  return n === 1 || n === 2 || n === 3 ? n : null
}

function cleanString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

const lower = (s: string) => s.toLowerCase()
const upper = (s: string) => s.toUpperCase()
