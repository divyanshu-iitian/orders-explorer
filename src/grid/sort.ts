import { FIELD_BY_KEY, PRIORITY_NONE, type EnumField, type FieldKey } from '../data/fields'
import type { OrderIndex } from '../data/orderIndex'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: FieldKey
  direction: SortDirection
}

/** Header click cycle: ascending, then descending, then back to file order. */
export function nextSort(current: SortState | null, key: FieldKey): SortState | null {
  if (current?.key !== key) return { key, direction: 'asc' }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null
}

const cache = new WeakMap<OrderIndex, Map<string, Int32Array>>()

/**
 * Order positions sorted by one field, compared by the field's real type.
 * Empty values (null dates, missing priority, empty notes...) always go last,
 * in both directions. Ties keep file order, so sorting is stable and repeatable.
 * Results are cached per field and direction; the data never changes after load.
 */
export function sortPositions(index: OrderIndex, sort: SortState): Int32Array {
  let byKey = cache.get(index)
  if (!byKey) {
    byKey = new Map()
    cache.set(index, byKey)
  }
  const cacheKey = `${sort.key}:${sort.direction}`
  let result = byKey.get(cacheKey)
  if (!result) {
    result = computeSort(index, sort)
    byKey.set(cacheKey, result)
  }
  return result
}

function computeSort(index: OrderIndex, { key, direction }: SortState): Int32Array {
  const sign = direction === 'asc' ? 1 : -1
  const present: number[] = []
  const empty: number[] = []
  const field = FIELD_BY_KEY[key]

  if (field.kind === 'text') {
    const values = index.text[key as keyof OrderIndex['text']]
    for (let i = 0; i < index.size; i++) (values[i] === '' ? empty : present).push(i)
    present.sort((a, b) => (values[a] < values[b] ? -sign : values[a] > values[b] ? sign : a - b))
  } else {
    const values =
      field.kind === 'enum' ? enumRanks(index, key as EnumField) : index.numeric[key as keyof OrderIndex['numeric']]
    for (let i = 0; i < index.size; i++) (Number.isNaN(values[i]) ? empty : present).push(i)
    present.sort((a, b) => (values[a] - values[b]) * sign || a - b)
  }

  const out = new Int32Array(index.size)
  out.set(present)
  out.set(empty, present.length)
  return out
}

/**
 * Fixed-set fields sort by the label the user sees (Cancelled, Delivered, ...),
 * except priority, which sorts by its number so P1 comes first.
 */
function enumRanks(index: OrderIndex, key: EnumField): Float64Array {
  const options = FIELD_BY_KEY[key].options ?? []
  const ranked =
    key === 'priority'
      ? options.filter((o) => o.value !== PRIORITY_NONE)
      : [...options].sort((a, b) => a.label.localeCompare(b.label))
  const rank = new Map(ranked.map((o, r) => [o.value, r]))

  const column = index.enums[key]
  const out = new Float64Array(index.size)
  for (let i = 0; i < index.size; i++) out[i] = rank.get(column[i] ?? '') ?? Number.NaN
  return out
}
