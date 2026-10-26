import { FIELD_BY_KEY, isFieldKey, type FieldKey } from '../data/fields'
import { newId, operatorDef, type Condition, type Filter, type FilterGroup, type Operator } from '../filters/model'
import type { SortState } from '../grid/sort'
import { decodeSelection, encodeSelection } from './selectionCodec'

/**
 * Everything a shared link has to reproduce. Layout preferences (column
 * widths, collapsed panel) are deliberately not part of it.
 *
 *   ?f=[[["status","in",["shipped"]]],[["amount","gt",["5000"]]]]   filter: groups of [field, operator, values]
 *   &sort=-amount                                                    "-" means descending
 *   &pin=customer                                                    "none" when nothing is pinned
 *   &sel=r12-40.97                                                   see selectionCodec.ts
 */
export interface ViewState {
  filter: Filter
  sort: SortState | null
  pinned: FieldKey | null
  selection: ReadonlySet<string>
}

export const DEFAULT_PINNED: FieldKey = 'id'

const LIMITS = { groups: 20, conditionsPerGroup: 20, valueLength: 200 }

export interface ParsedUrl {
  state: ViewState
  /** One human-readable line per part of the link that had to be reset. */
  problems: string[]
}

/**
 * Reads the query string. Each part is validated on its own: a broken part
 * falls back to its default and is reported, the rest of the link still applies.
 * Never throws.
 */
export function parseViewState(search: string, orderExists: (id: string) => boolean): ParsedUrl {
  const params = new URLSearchParams(search)
  const problems: string[] = []

  let filter: Filter = []
  const rawFilter = params.get('f')
  if (rawFilter !== null) {
    const result = parseFilter(rawFilter)
    if (typeof result === 'string') problems.push(`Filter: ${result}. Showing all orders instead.`)
    else filter = result
  }

  let sort: SortState | null = null
  const rawSort = params.get('sort')
  if (rawSort !== null) {
    const key = rawSort.replace(/^-/, '')
    if (isFieldKey(key)) sort = { key, direction: rawSort.startsWith('-') ? 'desc' : 'asc' }
    else problems.push(`Sort: “${truncate(rawSort)}” is not a column. Using the default order.`)
  }

  let pinned: FieldKey | null = DEFAULT_PINNED
  const rawPin = params.get('pin')
  if (rawPin !== null) {
    if (rawPin === 'none') pinned = null
    else if (isFieldKey(rawPin)) pinned = rawPin
    else problems.push(`Pinned column: “${truncate(rawPin)}” is not a column. Pinning Order ID instead.`)
  }

  let selection = new Set<string>()
  const rawSelection = params.get('sel')
  if (rawSelection !== null) {
    const ids = decodeSelection(rawSelection)
    if (ids === null) {
      problems.push('Selection: the list of selected orders could not be read, so nothing is selected.')
    } else {
      const known = ids.filter(orderExists)
      selection = new Set(known)
      const missing = ids.length - known.length
      if (missing > 0) {
        problems.push(
          `Selection: ${missing === 1 ? '1 selected order does' : `${missing} selected orders do`} not exist and ${missing === 1 ? 'was' : 'were'} dropped.`,
        )
      }
    }
  }

  return { state: { filter, sort, pinned, selection }, problems }
}

export function serializeViewState({ filter, sort, pinned, selection }: ViewState): string {
  const params = new URLSearchParams()
  if (filter.length) {
    params.set('f', JSON.stringify(filter.map((g) => g.conditions.map((c) => [c.field, c.operator, c.values]))))
  }
  if (sort) params.set('sort', `${sort.direction === 'desc' ? '-' : ''}${sort.key}`)
  if (pinned !== DEFAULT_PINNED) params.set('pin', pinned ?? 'none')
  const sel = encodeSelection(selection)
  if (sel) params.set('sel', sel)
  return params.toString()
}

/** Returns the filter, or a reason it was rejected. */
function parseFilter(raw: string): Filter | string {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return 'the link is cut off or was edited by hand'
  }
  if (!Array.isArray(data)) return 'unexpected format'
  if (data.length > LIMITS.groups) return `more than ${LIMITS.groups} groups`

  const groups: FilterGroup[] = []
  for (const rawGroup of data) {
    if (!Array.isArray(rawGroup) || rawGroup.length === 0) return 'unexpected format'
    if (rawGroup.length > LIMITS.conditionsPerGroup)
      return `more than ${LIMITS.conditionsPerGroup} conditions in a group`
    const conditions: Condition[] = []
    for (const rawCondition of rawGroup) {
      const condition = parseCondition(rawCondition)
      if (typeof condition === 'string') return condition
      conditions.push(condition)
    }
    groups.push({ id: newId('g'), conditions })
  }
  return groups
}

function parseCondition(raw: unknown): Condition | string {
  if (!Array.isArray(raw) || raw.length !== 3) return 'unexpected format'
  const [field, operator, values] = raw as unknown[]
  if (!isFieldKey(field)) return `“${truncate(String(field))}” is not a field`
  const def = typeof operator === 'string' ? operatorDef(field, operator as Operator) : undefined
  if (!def) return `“${truncate(String(operator))}” does not apply to ${FIELD_BY_KEY[field].label}`
  if (!Array.isArray(values) || !values.every((v) => typeof v === 'string' && v.length <= LIMITS.valueLength)) {
    return `bad value for ${FIELD_BY_KEY[field].label}`
  }

  if (def.inputs === 'list') {
    const options = FIELD_BY_KEY[field].options ?? []
    const unknown = values.find((v) => !options.some((o) => o.value === v))
    if (unknown !== undefined) return `“${truncate(unknown)}” is not a ${FIELD_BY_KEY[field].label.toLowerCase()}`
    // Same order the builder uses, without repeats.
    const picked = options.map((o) => o.value).filter((v) => values.includes(v))
    return { id: newId('c'), field, operator: def.value, values: picked }
  }

  if (values.length !== def.inputs) return `wrong number of values for ${FIELD_BY_KEY[field].label}`
  return { id: newId('c'), field, operator: def.value, values: values as string[] }
}

function truncate(text: string) {
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}
