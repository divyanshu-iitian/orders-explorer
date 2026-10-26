import { enumValue, type DateField, type EnumField, type NumberField, type TextField } from './fields'
import type { Order } from './types'

/**
 * Column-oriented copies of the fields that filters and sorting read.
 * Built once after loading, so a filter pass over 50,000 rows only touches
 * flat arrays: no lower-casing, no null checks on objects, no allocation.
 */
export interface OrderIndex {
  size: number
  /** Lower-cased for case-insensitive matching. */
  text: Record<TextField, string[]>
  /** NaN where the order has no value. */
  numeric: Record<NumberField | DateField, Float64Array>
  enums: Record<EnumField, (string | null)[]>
  positionById: Map<string, number>
}

export function buildOrderIndex(orders: readonly Order[]): OrderIndex {
  const size = orders.length
  const textColumn = (pick: (o: Order) => string) => orders.map((o) => pick(o).toLowerCase())
  const numericColumn = (pick: (o: Order) => number | null) => {
    const column = new Float64Array(size)
    for (let i = 0; i < size; i++) column[i] = pick(orders[i]) ?? Number.NaN
    return column
  }
  const enumColumn = (field: EnumField) => orders.map((o) => enumValue(o, field))

  return {
    size,
    text: {
      id: textColumn((o) => o.id),
      customer: textColumn((o) => o.customer),
      email: textColumn((o) => o.email),
      notes: textColumn((o) => o.notes),
    },
    numeric: {
      amount: numericColumn((o) => o.amount),
      itemCount: numericColumn((o) => o.itemCount),
      createdAt: numericColumn((o) => o.createdAt),
      updatedAt: numericColumn((o) => o.updatedAt),
    },
    enums: {
      status: enumColumn('status'),
      region: enumColumn('region'),
      channel: enumColumn('channel'),
      paymentMethod: enumColumn('paymentMethod'),
      priority: enumColumn('priority'),
    },
    positionById: new Map(orders.map((o, i) => [o.id, i])),
  }
}
