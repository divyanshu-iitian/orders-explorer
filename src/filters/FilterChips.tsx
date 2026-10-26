import { Fragment } from 'react'
import { CloseIcon } from '../components/icons'
import { checkCondition } from './compile'
import { describeCondition } from './describe'
import type { Filter } from './model'
import './FilterChips.css'

interface FilterChipsProps {
  filter: Filter
  onRemove: (conditionId: string) => void
  onClearAll: () => void
}

/** The active filter in one line: chips inside a group are joined by "or", groups by "and". */
export function FilterChips({ filter, onRemove, onClearAll }: FilterChipsProps) {
  const groups = filter
    .map((g) => ({ id: g.id, conditions: g.conditions.filter((c) => checkCondition(c).kind === 'active') }))
    .filter((g) => g.conditions.length > 0)

  if (groups.length === 0) {
    return (
      <div className="chips chips--empty">
        No filters applied. Press <kbd>/</kbd> to add one.
      </div>
    )
  }

  return (
    <div className="chips" role="group" aria-label="Active filters">
      {groups.map((group, gi) => (
        <Fragment key={group.id}>
          {gi > 0 && <span className="chips__join chips__join--and">and</span>}
          <span className={group.conditions.length > 1 ? 'chips__group' : 'chips__single'}>
            {group.conditions.map((condition, ci) => {
              const label = describeCondition(condition)
              return (
                <Fragment key={condition.id}>
                  {ci > 0 && <span className="chips__join">or</span>}
                  <span className="chip" title={label}>
                    <span className="chip__label">{label}</span>
                    <button
                      type="button"
                      className="chip__remove"
                      aria-label={`Remove filter: ${label}`}
                      onClick={() => onRemove(condition.id)}
                    >
                      <CloseIcon size={10} />
                    </button>
                  </span>
                </Fragment>
              )
            })}
          </span>
        </Fragment>
      ))}
      <button type="button" className="btn btn--link chips__clear" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}
