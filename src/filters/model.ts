import { FIELD_BY_KEY, type FieldKey, type FieldKind } from '../data/fields'

/**
 * The filter is a list of groups. Conditions inside a group are OR-ed,
 * groups are AND-ed: (a OR b) AND (c). One level only.
 *
 * Every condition keeps its values as the strings the user typed, so a
 * half-typed number or an unfinished date survives a refresh via the URL.
 * compile.ts decides whether a condition is complete enough to apply.
 */
export interface Condition {
  id: string
  field: FieldKey
  operator: Operator
  values: string[]
}

export interface FilterGroup {
  id: string
  conditions: Condition[]
}

export type Filter = readonly FilterGroup[]

export type Operator =
  'contains' | 'notContains' | 'equals' | 'eq' | 'gt' | 'lt' | 'between' | 'before' | 'after' | 'in' | 'notIn'

export interface OperatorDef {
  value: Operator
  label: string
  /** How many inputs the operator needs; enum operators take a list. */
  inputs: 1 | 2 | 'list'
}

export const OPERATORS: Record<FieldKind, readonly OperatorDef[]> = {
  text: [
    { value: 'contains', label: 'contains', inputs: 1 },
    { value: 'notContains', label: 'does not contain', inputs: 1 },
    { value: 'equals', label: 'equals', inputs: 1 },
  ],
  number: [
    { value: 'eq', label: 'equals', inputs: 1 },
    { value: 'gt', label: 'greater than', inputs: 1 },
    { value: 'lt', label: 'less than', inputs: 1 },
    { value: 'between', label: 'between', inputs: 2 },
  ],
  date: [
    { value: 'before', label: 'before', inputs: 1 },
    { value: 'after', label: 'after', inputs: 1 },
    { value: 'between', label: 'between', inputs: 2 },
  ],
  enum: [
    { value: 'in', label: 'is one of', inputs: 'list' },
    { value: 'notIn', label: 'is not one of', inputs: 'list' },
  ],
}

export function operatorsFor(field: FieldKey): readonly OperatorDef[] {
  return OPERATORS[FIELD_BY_KEY[field].kind]
}

export function operatorDef(field: FieldKey, operator: Operator): OperatorDef | undefined {
  return operatorsFor(field).find((o) => o.value === operator)
}

let counter = 0
export const newId = (prefix: string) => `${prefix}${(++counter).toString(36)}`

export function newCondition(field: FieldKey = 'status'): Condition {
  const operator = operatorsFor(field)[0]
  return { id: newId('c'), field, operator: operator.value, values: emptyValues(operator) }
}

function emptyValues(operator: OperatorDef): string[] {
  return operator.inputs === 2 ? ['', ''] : operator.inputs === 1 ? [''] : []
}

/** A different field resets the operator and values unless both fields are the same kind. */
export function withField(condition: Condition, field: FieldKey): Condition {
  if (field === condition.field) return condition
  const sameKind = FIELD_BY_KEY[field].kind === FIELD_BY_KEY[condition.field].kind
  if (sameKind && FIELD_BY_KEY[field].kind !== 'enum') return { ...condition, field }
  const fresh = newCondition(field)
  return { ...fresh, id: condition.id }
}

/** Keeps what was typed where it still makes sense (e.g. "greater than 500" → "between 500 and _"). */
export function withOperator(condition: Condition, operator: Operator): Condition {
  const def = operatorDef(condition.field, operator)
  if (!def) return condition
  if (def.inputs === 'list') return { ...condition, operator, values: condition.values }
  const values = Array.from({ length: def.inputs }, (_, i) => condition.values[i] ?? '')
  return { ...condition, operator, values }
}

// ---- edits on the whole filter (all return a new filter) ----

export function addGroup(filter: Filter, condition = newCondition()): FilterGroup[] {
  return [...filter, { id: newId('g'), conditions: [condition] }]
}

export function addCondition(filter: Filter, groupId: string, condition = newCondition()): FilterGroup[] {
  return filter.map((g) => (g.id === groupId ? { ...g, conditions: [...g.conditions, condition] } : g))
}

export function replaceCondition(filter: Filter, next: Condition): FilterGroup[] {
  return filter.map((g) =>
    g.conditions.some((c) => c.id === next.id)
      ? { ...g, conditions: g.conditions.map((c) => (c.id === next.id ? next : c)) }
      : g,
  )
}

/** Removing the last condition of a group removes the group too. */
export function removeCondition(filter: Filter, conditionId: string): FilterGroup[] {
  return filter
    .map((g) => ({ ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }))
    .filter((g) => g.conditions.length > 0)
}

export function removeGroup(filter: Filter, groupId: string): FilterGroup[] {
  return filter.filter((g) => g.id !== groupId)
}
