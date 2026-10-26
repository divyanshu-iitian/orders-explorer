export const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const
export const REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTHEAST'] as const
export const CHANNELS = ['web', 'app', 'phone', 'store'] as const
export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'cod', 'wallet'] as const

export type Status = (typeof STATUSES)[number]
export type Region = (typeof REGIONS)[number]
export type Channel = (typeof CHANNELS)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type Priority = 1 | 2 | 3

/**
 * One order after cleaning. Every quirk listed in data-notes.md is resolved
 * before a record becomes an `Order`, so nothing downstream (grid, filters,
 * export) needs to know about the raw format.
 *
 * `null` always means "missing or unreadable in the source". The grid shows it
 * as a dash, sorting puts it last and no filter value matches it (except the
 * explicit "None" option for priority).
 */
export interface Order {
  id: string
  schemaVersion: 1 | 2
  customer: string
  email: string
  status: Status | null
  /** Rupees, regardless of the unit in the source record. `null` if unreadable. */
  amount: number | null
  currency: string
  /** Epoch milliseconds, UTC. */
  createdAt: number | null
  updatedAt: number | null
  region: Region | null
  channel: Channel | null
  priority: Priority | null
  paymentMethod: PaymentMethod | null
  itemCount: number | null
  /** Plain text, never HTML. Empty string when the source was null or missing. */
  notes: string
}

export interface NormalizeReport {
  /** Records in the file. */
  read: number
  /** Orders after de-duplication. */
  kept: number
  duplicatesRemoved: number
  /** Entries that were not objects or had no usable id. */
  skipped: number
  /** Enum values (status, region, ...) that matched none of the known values. */
  unknownValues: number
  unreadableDates: number
}
