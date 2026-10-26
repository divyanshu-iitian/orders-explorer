import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeftIcon, CloseIcon, FilterIcon, PlusIcon } from '../components/icons'
import { ConditionRow } from './ConditionRow'
import {
  addCondition,
  addGroup,
  newCondition,
  removeCondition,
  removeGroup,
  replaceCondition,
  type Condition,
  type Filter,
} from './model'
import './FilterPanel.css'

interface FilterPanelProps {
  filter: Filter
  onChange: (update: (current: Filter) => Filter) => void
  activeCount: number
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  /** Bumped by the "/" shortcut: the panel opens and takes focus. */
  focusRequest: number
  /** Esc inside the panel hands focus back to the grid. */
  onExit: () => void
}

export function FilterPanel({
  filter,
  onChange,
  activeCount,
  collapsed,
  onCollapsedChange,
  focusRequest,
  onExit,
}: FilterPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  // The condition that should grab focus once it mounts (just added by the user).
  const [focusId, setFocusId] = useState<string | null>(null)

  const add = useCallback(
    (groupId?: string) => {
      const condition = newCondition()
      setFocusId(condition.id)
      onChange((f) => (groupId ? addCondition(f, groupId, condition) : addGroup(f, condition)))
    },
    [onChange],
  )

  const update = useCallback((next: Condition) => onChange((f) => replaceCondition(f, next)), [onChange])
  const remove = useCallback((id: string) => onChange((f) => removeCondition(f, id)), [onChange])

  useEffect(() => {
    if (focusRequest === 0 || collapsed) return
    const first = bodyRef.current?.querySelector<HTMLElement>('select, input, button')
    if (first) first.focus()
  }, [focusRequest, collapsed])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onExit()
    }
  }

  if (collapsed) {
    return (
      <aside className="filters filters--collapsed" aria-label="Filters">
        <button
          type="button"
          className="filters__rail"
          onClick={() => onCollapsedChange(false)}
          title="Show filters (/)"
          aria-label={`Show filters, ${activeCount} active`}
        >
          <FilterIcon />
          {activeCount > 0 && <span className="filters__badge">{activeCount}</span>}
        </button>
      </aside>
    )
  }

  let position = 0
  return (
    <aside className="filters" aria-label="Filters" onKeyDown={onKeyDown}>
      <header className="filters__header">
        <h2 className="filters__title">Filters</h2>
        {activeCount > 0 && <span className="filters__count">{activeCount} active</span>}
        <button
          type="button"
          className="icon-btn filters__collapse"
          onClick={() => onCollapsedChange(true)}
          aria-label="Hide filters"
          title="Hide filters"
        >
          <ChevronLeftIcon />
        </button>
      </header>

      <div className="filters__body" ref={bodyRef}>
        {filter.length === 0 ? (
          <div className="filters__empty">
            <p>No filters yet. Every order is shown.</p>
            <button type="button" className="btn btn--primary" onClick={() => add()}>
              <PlusIcon /> Add condition
            </button>
          </div>
        ) : (
          <>
            <p className="filters__help">
              A group matches if <em>any</em> of its conditions match. An order is shown if it matches <em>every</em>{' '}
              group.
            </p>
            {filter.map((group, gi) => (
              <Fragment key={group.id}>
                {gi > 0 && (
                  <div className="filters__and" aria-hidden="true">
                    <span>and</span>
                  </div>
                )}
                <section className="group" aria-label={`Group ${gi + 1}, any condition can match`}>
                  <header className="group__header">
                    <span className="group__title">Group {gi + 1}</span>
                    <span className="group__mode">match any</span>
                    <button
                      type="button"
                      className="icon-btn group__remove"
                      onClick={() => onChange((f) => removeGroup(f, group.id))}
                      aria-label={`Remove group ${gi + 1}`}
                      title="Remove group"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </header>
                  {group.conditions.map((condition, ci) => (
                    <Fragment key={condition.id}>
                      {ci > 0 && (
                        <div className="group__or" aria-hidden="true">
                          or
                        </div>
                      )}
                      <ConditionRow
                        condition={condition}
                        position={++position}
                        autoFocus={condition.id === focusId}
                        onChange={update}
                        onRemove={remove}
                      />
                    </Fragment>
                  ))}
                  <button type="button" className="btn btn--ghost group__add" onClick={() => add(group.id)}>
                    <PlusIcon size={12} /> Add “or” condition
                  </button>
                </section>
              </Fragment>
            ))}
            <button type="button" className="btn filters__add-group" onClick={() => add()}>
              <PlusIcon size={12} /> Add “and” group
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
