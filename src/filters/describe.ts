import { parseDateInput } from '../data/dates'
import { FIELD_BY_KEY, optionLabel, type EnumField } from '../data/fields'
import { formatAmountShort, formatDate, formatNumber } from '../lib/format'
import { parseNumberInput } from './compile'
import type { Condition } from './model'

/** Short, readable text for a chip, e.g. `Amount > ₹5,000` or `Status is Shipped or Delivered`. */
export function describeCondition({ field, operator, values }: Condition): string {
  const def = FIELD_BY_KEY[field]
  const label = def.label

  switch (def.kind) {
    case 'text': {
      const quoted = `“${values[0]?.trim() ?? ''}”`
      if (operator === 'notContains') return `${label} does not contain ${quoted}`
      if (operator === 'equals') return `${label} is ${quoted}`
      return `${label} contains ${quoted}`
    }
    case 'number': {
      const show = (text: string | undefined) => {
        const n = parseNumberInput(text ?? '')
        if (n === null) return text ?? ''
        return field === 'amount' ? formatAmountShort(n) : formatNumber(n)
      }
      if (operator === 'between') return `${label} ${show(values[0])} – ${show(values[1])}`
      const symbol = operator === 'gt' ? '>' : operator === 'lt' ? '<' : '='
      return `${label} ${symbol} ${show(values[0])}`
    }
    case 'date': {
      const show = (text: string | undefined) => {
        const ms = parseDateInput(text ?? '')
        return ms === null ? (text ?? '') : formatDate(ms)
      }
      if (operator === 'between') return `${label} ${show(values[0])} – ${show(values[1])}`
      return `${label} ${operator === 'before' ? 'before' : 'after'} ${show(values[0])}`
    }
    case 'enum': {
      const names = values.map((v) => optionLabel(field as EnumField, v))
      if (operator === 'notIn') {
        return names.length === 1 ? `${label} is not ${names[0]}` : `${label} is none of ${names.join(', ')}`
      }
      if (names.length <= 2) return `${label} is ${names.join(' or ')}`
      return `${label} is one of ${names.join(', ')}`
    }
  }
}
