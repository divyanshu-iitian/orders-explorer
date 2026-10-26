import type { CSSProperties, ReactNode } from 'react'
import { optionLabel, type FieldKey } from '../data/fields'
import type { Order } from '../data/types'
import { EMPTY, formatAmount, formatDateTime, formatNumber } from '../lib/format'

export interface Column {
  key: FieldKey
  label: string
  defaultWidth: number
  align?: 'right'
  mono?: boolean
  /** Long values get a tooltip with the full text. */
  truncate?: boolean
  /** Plain text for the cell; also used as the tooltip. */
  text: (order: Order) => string
  /** Richer cell content when plain text is not enough. */
  render?: (order: Order) => ReactNode
}

export const MIN_COLUMN_WIDTH = 48

const enumText = (key: 'status' | 'region' | 'channel' | 'paymentMethod') => (o: Order) =>
  optionLabel(key, o[key]) || EMPTY

export const COLUMNS: readonly Column[] = [
  { key: 'id', label: 'Order ID', defaultWidth: 112, mono: true, text: (o) => o.id },
  { key: 'customer', label: 'Customer', defaultWidth: 150, truncate: true, text: (o) => o.customer || EMPTY },
  { key: 'email', label: 'Email', defaultWidth: 220, truncate: true, text: (o) => o.email || EMPTY },
  {
    key: 'status',
    label: 'Status',
    defaultWidth: 108,
    text: enumText('status'),
    render: (o) =>
      o.status ? <span className={`status status--${o.status}`}>{optionLabel('status', o.status)}</span> : EMPTY,
  },
  { key: 'amount', label: 'Amount', defaultWidth: 116, align: 'right', text: (o) => formatAmount(o.amount) },
  { key: 'itemCount', label: 'Items', defaultWidth: 64, align: 'right', text: (o) => formatNumber(o.itemCount) },
  {
    key: 'priority',
    label: 'Priority',
    defaultWidth: 76,
    text: (o) => (o.priority === null ? 'None' : `P${o.priority}`),
    render: (o) =>
      o.priority === null ? (
        <span className="muted">None</span>
      ) : (
        <span className={`prio prio--${o.priority}`}>P{o.priority}</span>
      ),
  },
  { key: 'region', label: 'Region', defaultWidth: 96, text: enumText('region') },
  { key: 'channel', label: 'Channel', defaultWidth: 82, text: enumText('channel') },
  { key: 'paymentMethod', label: 'Payment', defaultWidth: 96, text: enumText('paymentMethod') },
  { key: 'createdAt', label: 'Created (UTC)', defaultWidth: 140, text: (o) => formatDateTime(o.createdAt) },
  { key: 'updatedAt', label: 'Updated (UTC)', defaultWidth: 140, text: (o) => formatDateTime(o.updatedAt) },
  {
    key: 'notes',
    label: 'Notes',
    defaultWidth: 320,
    truncate: true,
    // Rendered as a text node, so markup in notes shows up literally.
    text: (o) => o.notes.replace(/\s+/g, ' ').trim() || EMPTY,
  },
]

export const COLUMN_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c])) as Record<FieldKey, Column>

export type ColumnWidths = Record<FieldKey, number>

export const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth])) as ColumnWidths

// Each cell reads its width from a CSS variable on the grid, so resizing a
// column updates one style attribute instead of re-rendering every row.
export const CELL_STYLE = Object.fromEntries(
  COLUMNS.map((c) => [c.key, { width: `var(--w-${c.key})` } satisfies CSSProperties]),
) as Record<FieldKey, CSSProperties>
