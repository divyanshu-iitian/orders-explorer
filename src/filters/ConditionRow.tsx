import { memo, useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../components/icons'
import { FIELD_BY_KEY, FIELDS, type FieldKey } from '../data/fields'
import { checkCondition } from './compile'
import { operatorDef, operatorsFor, withField, withOperator, type Condition, type Operator } from './model'

interface ConditionRowProps {
  condition: Condition
  position: number
  autoFocus: boolean
  onChange: (next: Condition) => void
  onRemove: (id: string) => void
}

export const ConditionRow = memo(function ConditionRow({
  condition,
  position,
  autoFocus,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const fieldRef = useRef<HTMLSelectElement>(null)
  const messageId = useId()
  const state = checkCondition(condition)
  const invalid = state.kind === 'invalid'
  const message = state.kind === 'invalid' ? state.message : state.kind === 'incomplete' ? state.hint : undefined

  useEffect(() => {
    if (autoFocus) fieldRef.current?.focus()
  }, [autoFocus])

  return (
    <div
      className={`cond${state.kind === 'active' ? ' is-active' : ''}`}
      role="group"
      aria-label={`Condition ${position}`}
    >
      <div className="cond__line">
        <select
          ref={fieldRef}
          className="cond__field"
          aria-label="Field"
          value={condition.field}
          onChange={(e) => onChange(withField(condition, e.target.value as FieldKey))}
        >
          {FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="cond__operator"
          aria-label="Operator"
          value={condition.operator}
          onChange={(e) => onChange(withOperator(condition, e.target.value as Operator))}
        >
          {operatorsFor(condition.field).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Remove condition ${position}`}
          title="Remove condition"
          onClick={() => onRemove(condition.id)}
        >
          <CloseIcon size={12} />
        </button>
      </div>
      <ValueInput
        condition={condition}
        invalid={invalid}
        describedBy={message ? messageId : undefined}
        onChange={onChange}
      />
      {message && (
        <p id={messageId} className={`cond__message${invalid ? ' is-error' : ''}`}>
          {message}
        </p>
      )}
    </div>
  )
})

interface ValueInputProps {
  condition: Condition
  invalid: boolean
  describedBy: string | undefined
  onChange: (next: Condition) => void
}

function ValueInput({ condition, invalid, describedBy, onChange }: ValueInputProps) {
  const field = FIELD_BY_KEY[condition.field]
  const def = operatorDef(condition.field, condition.operator)
  const setValue = (i: number, value: string) => {
    const values = [...condition.values]
    values[i] = value
    onChange({ ...condition, values })
  }

  if (field.kind === 'enum') {
    const selected = new Set(condition.values)
    const toggle = (value: string) =>
      onChange({
        ...condition,
        // Keep the option order rather than click order, so chips read consistently.
        values: (field.options ?? [])
          .map((o) => o.value)
          .filter((v) => (v === value ? !selected.has(v) : selected.has(v))),
      })
    return (
      <div className="cond__options" role="group" aria-label={`${field.label} values`} aria-describedby={describedBy}>
        {field.options?.map((option) => (
          <button
            key={option.value}
            type="button"
            className="option-toggle"
            aria-pressed={selected.has(option.value)}
            onClick={() => toggle(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  const inputs = def?.inputs === 2 ? 2 : 1
  const common = {
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
  }

  if (field.kind === 'date') {
    return (
      <div className="cond__inputs">
        {Array.from({ length: inputs }, (_, i) => (
          <span key={i} className="cond__input-wrap">
            {i === 1 && <span className="cond__joiner">to</span>}
            <input
              type="date"
              className="input"
              aria-label={inputs === 2 ? (i === 0 ? 'From date' : 'To date') : 'Date'}
              value={condition.values[i] ?? ''}
              onChange={(e) => setValue(i, e.target.value)}
              {...common}
            />
          </span>
        ))}
      </div>
    )
  }

  if (field.kind === 'number') {
    const unit = condition.field === 'amount' ? '₹' : ''
    return (
      <div className="cond__inputs">
        {Array.from({ length: inputs }, (_, i) => (
          <span key={i} className="cond__input-wrap">
            {i === 1 && <span className="cond__joiner">and</span>}
            <input
              type="text"
              inputMode="decimal"
              className="input input--number"
              placeholder={inputs === 2 ? (i === 0 ? `${unit}min` : `${unit}max`) : `${unit}value`}
              aria-label={inputs === 2 ? (i === 0 ? 'Minimum' : 'Maximum') : 'Value'}
              value={condition.values[i] ?? ''}
              onChange={(e) => setValue(i, e.target.value)}
              {...common}
            />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="cond__inputs">
      <input
        type="text"
        className="input"
        placeholder={`${field.label}…`}
        aria-label="Text"
        value={condition.values[0] ?? ''}
        onChange={(e) => setValue(0, e.target.value)}
        spellCheck={false}
        {...common}
      />
    </div>
  )
}
