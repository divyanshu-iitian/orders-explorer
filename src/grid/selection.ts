import type { Order } from '../data/types'

// Selection is a set of order ids rather than row numbers, so it survives
// sorting and filtering: a selected order stays selected wherever it moves.

export type Selection = ReadonlySet<string>

export function toggleId(selection: Selection, id: string): Selection {
  const next = new Set(selection)
  if (!next.delete(id)) next.add(id)
  return next
}

/** Sets rows `from`..`to` (inclusive, either order) of the current view to `selected`. */
export function setRange(
  selection: Selection,
  orders: readonly Order[],
  rows: Int32Array,
  from: number,
  to: number,
  selected = true,
): Selection {
  const next = new Set(selection)
  const lo = Math.max(0, Math.min(from, to))
  const hi = Math.min(rows.length - 1, Math.max(from, to))
  for (let r = lo; r <= hi; r++) {
    const id = orders[rows[r]].id
    if (selected) next.add(id)
    else next.delete(id)
  }
  return next
}

/** How many of the selected ids are in the current view. */
export function countVisible(selection: Selection, visible: Uint8Array, positionById: Map<string, number>): number {
  let n = 0
  for (const id of selection) {
    const position = positionById.get(id)
    if (position !== undefined && visible[position]) n++
  }
  return n
}
