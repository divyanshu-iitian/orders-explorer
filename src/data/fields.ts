import type { Order } from './types'

/**
 * Field metadata shared by the grid, the filter builder, the chips and the
 * CSV export, so a field has one label and one type everywhere.
 */

export type TextField = 'id' | 'customer' | 'email' | 'notes'
export type NumberField = 'amount' | 'itemCount'
export type DateField = 'createdAt' | 'updatedAt'
export type EnumField = 'status' | 'region' | 'channel' | 'paymentMethod' | 'priority'
export type FieldKey = TextField | NumberField | DateField | EnumField
export type FieldKind = 'text' | 'number' | 'date' | 'enum'

export interface Option {
  value: string
  label: string
}

export interface FieldDef {
  key: FieldKey
  label: string
  kind: FieldKind
  /** Only for enum fields: every value the filter can pick from. */
  options?: readonly Option[]
}

export const STATUS_OPTIONS: readonly Option[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const REGION_OPTIONS: readonly Option[] = [
  { value: 'NORTH', label: 'North' },
  { value: 'SOUTH', label: 'South' },
  { value: 'EAST', label: 'East' },
  { value: 'WEST', label: 'West' },
  { value: 'CENTRAL', label: 'Central' },
  { value: 'NORTHEAST', label: 'Northeast' },
]

export const CHANNEL_OPTIONS: readonly Option[] = [
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App' },
  { value: 'phone', label: 'Phone' },
  { value: 'store', label: 'Store' },
]

export const PAYMENT_OPTIONS: readonly Option[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'netbanking', label: 'Netbanking' },
  { value: 'cod', label: 'COD' },
  { value: 'wallet', label: 'Wallet' },
]

/** Priority is a number in the data, but filtered like a fixed set so "None" can be picked. */
export const PRIORITY_NONE = 'none'
export const PRIORITY_OPTIONS: readonly Option[] = [
  { value: '1', label: 'P1' },
  { value: '2', label: 'P2' },
  { value: '3', label: 'P3' },
  { value: PRIORITY_NONE, label: 'None' },
]

export const FIELDS: readonly FieldDef[] = [
  { key: 'id', label: 'Order ID', kind: 'text' },
  { key: 'customer', label: 'Customer', kind: 'text' },
  { key: 'email', label: 'Email', kind: 'text' },
  { key: 'status', label: 'Status', kind: 'enum', options: STATUS_OPTIONS },
  { key: 'amount', label: 'Amount', kind: 'number' },
  { key: 'itemCount', label: 'Items', kind: 'number' },
  { key: 'priority', label: 'Priority', kind: 'enum', options: PRIORITY_OPTIONS },
  { key: 'region', label: 'Region', kind: 'enum', options: REGION_OPTIONS },
  { key: 'channel', label: 'Channel', kind: 'enum', options: CHANNEL_OPTIONS },
  { key: 'paymentMethod', label: 'Payment', kind: 'enum', options: PAYMENT_OPTIONS },
  { key: 'createdAt', label: 'Created', kind: 'date' },
  { key: 'updatedAt', label: 'Updated', kind: 'date' },
  { key: 'notes', label: 'Notes', kind: 'text' },
]

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<FieldKey, FieldDef>

export function isFieldKey(value: unknown): value is FieldKey {
  return typeof value === 'string' && Object.hasOwn(FIELD_BY_KEY, value)
}

/** The value an enum filter compares against. Priority null becomes "none". */
export function enumValue(order: Order, field: EnumField): string | null {
  if (field === 'priority') return order.priority === null ? PRIORITY_NONE : String(order.priority)
  return order[field]
}

export function optionLabel(field: EnumField, value: string | null): string {
  if (value === null) return ''
  return FIELD_BY_KEY[field].options?.find((o) => o.value === value)?.label ?? value
}
