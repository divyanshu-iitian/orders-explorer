import { FIELD_BY_KEY, type DateField, type EnumField, type NumberField, type TextField } from '../data/fields'
import { endOfUtcDay, parseDateInput } from '../data/dates'
import type { OrderIndex } from '../data/orderIndex'
import type { Condition, Filter } from './model'

type RowTest = (position: number) => boolean

/**
 * What a condition does right now:
 * - incomplete: still being filled in, so it is ignored (the hint says what is missing)
 * - invalid:    filled in but unusable, also ignored, shown as an error
 * - active:     applied to the grid
 */
export type ConditionState =
  { kind: 'incomplete'; hint?: string } | { kind: 'invalid'; message: string } | { kind: 'active'; test: RowTest }

/** Validation only, without building a test: cheap enough to run on every keystroke. */
export function checkCondition(condition: Condition): ConditionState {
  return compileCondition(condition, null)
}

export function compileCondition(condition: Condition, index: OrderIndex | null): ConditionState {
  const { field, operator, values } = condition
  const kind = FIELD_BY_KEY[field].kind

  if (kind === 'text') {
    const needle = (values[0] ?? '').trim().toLowerCase()
    if (!needle) return { kind: 'incomplete' }
    if (!index) return ACTIVE
    const column = index.text[field as TextField]
    switch (operator) {
      case 'contains':
        return active((i) => column[i].includes(needle))
      case 'notContains':
        return active((i) => !column[i].includes(needle))
      case 'equals':
        return active((i) => column[i] === needle)
    }
  }

  if (kind === 'number') {
    const range = readPair(values, operator === 'between', parseNumberInput, 'Enter a number')
    if (range.kind !== 'ok') return range.state
    const [a, b] = range.values
    if (!index) return ACTIVE
    const column = index.numeric[field as NumberField]
    switch (operator) {
      // Amounts are rounded to paise, so "equals 99.99" must not miss on float noise.
      case 'eq':
        return active((i) => Math.abs(column[i] - a) < 0.005)
      case 'gt':
        return active((i) => column[i] > a)
      case 'lt':
        return active((i) => column[i] < a)
      case 'between':
        return active((i) => column[i] >= a && column[i] <= b)
    }
  }

  if (kind === 'date') {
    const range = readPair(values, operator === 'between', parseDateInput, 'Enter a valid date')
    if (range.kind !== 'ok') return range.state
    // Dates are whole UTC days: "before 14 Mar" excludes 14 Mar, "after 14 Mar"
    // starts on 15 Mar, "between 1 and 14 Mar" includes both days.
    const [from, to] = range.values
    if (!index) return ACTIVE
    const column = index.numeric[field as DateField]
    switch (operator) {
      case 'before':
        return active((i) => column[i] < from)
      case 'after':
        return active((i) => column[i] >= endOfUtcDay(from))
      case 'between': {
        const end = endOfUtcDay(to)
        return active((i) => column[i] >= from && column[i] < end)
      }
    }
  }

  if (kind === 'enum') {
    if (values.length === 0) return { kind: 'incomplete', hint: 'Pick at least one value' }
    if (!index) return ACTIVE
    const wanted = new Set(values)
    const column = index.enums[field as EnumField]
    switch (operator) {
      case 'in':
        return active((i) => wanted.has(column[i] as string))
      case 'notIn':
        return active((i) => column[i] !== null && !wanted.has(column[i]))
    }
  }

  return { kind: 'invalid', message: 'This operator does not apply to this field' }
}

/**
 * Compiles the whole filter into one row test, or null when nothing is active.
 * Groups without an active condition are skipped rather than matching nothing,
 * so an unfinished condition never empties the grid.
 */
export function compileFilter(filter: Filter, index: OrderIndex): { test: RowTest | null; activeCount: number } {
  const groups: RowTest[][] = []
  let activeCount = 0
  for (const group of filter) {
    const tests: RowTest[] = []
    for (const condition of group.conditions) {
      const state = compileCondition(condition, index)
      if (state.kind === 'active') tests.push(state.test)
    }
    if (tests.length) {
      groups.push(tests)
      activeCount += tests.length
    }
  }
  if (groups.length === 0) return { test: null, activeCount: 0 }

  const test: RowTest = (i) => {
    for (const anyOf of groups) {
      let matched = false
      for (const t of anyOf) {
        if (t(i)) {
          matched = true
          break
        }
      }
      if (!matched) return false
    }
    return true
  }
  return { test, activeCount }
}

/** "5,000", " ₹5000.50 " → number; anything else → null. */
export function parseNumberInput(text: string): number | null {
  const cleaned = text.replace(/[₹,\s]/g, '')
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

const ACTIVE: ConditionState = { kind: 'active', test: () => true }
const active = (test: RowTest): ConditionState => ({ kind: 'active', test })

type Pair = { kind: 'ok'; values: [number, number] } | { kind: 'error'; state: ConditionState }

function readPair(
  raw: readonly string[],
  isRange: boolean,
  parse: (text: string) => number | null,
  invalidMessage: string,
): Pair {
  const texts = isRange ? [raw[0] ?? '', raw[1] ?? ''] : [raw[0] ?? '']
  const filled = texts.filter((t) => t.trim() !== '')
  if (filled.length === 0) return { kind: 'error', state: { kind: 'incomplete' } }

  const parsed = texts.map((t) => (t.trim() === '' ? null : parse(t)))
  if (parsed.some((n, i) => n === null && texts[i].trim() !== '')) {
    return { kind: 'error', state: { kind: 'invalid', message: invalidMessage } }
  }
  if (filled.length < texts.length) {
    return { kind: 'error', state: { kind: 'incomplete', hint: 'Fill in both ends of the range' } }
  }
  const [a, b = a] = parsed as number[]
  if (isRange && a > b) {
    return { kind: 'error', state: { kind: 'invalid', message: 'The first value must not be after the second' } }
  }
  return { kind: 'ok', values: [a, b] }
}
