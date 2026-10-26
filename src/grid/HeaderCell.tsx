import { memo, type PointerEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, PinIcon } from '../components/icons'
import type { FieldKey } from '../data/fields'
import { CELL_STYLE, MIN_COLUMN_WIDTH, type Column } from './columns'
import type { SortDirection } from './sort'

interface HeaderCellProps {
  column: Column
  width: number
  sortDirection: SortDirection | null
  pinned: boolean
  onSort: (key: FieldKey) => void
  onPin: (key: FieldKey) => void
  onResize: (key: FieldKey, width: number) => void
  onResetWidth: (key: FieldKey) => void
}

export const HeaderCell = memo(function HeaderCell({
  column,
  width,
  sortDirection,
  pinned,
  onSort,
  onPin,
  onResize,
  onResetWidth,
}: HeaderCellProps) {
  const ariaSort = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
  const nextAction =
    sortDirection === null ? 'sort ascending' : sortDirection === 'asc' ? 'sort descending' : 'clear sort'

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    const startX = event.clientX
    handle.setPointerCapture(event.pointerId)
    document.body.classList.add('is-resizing-column')

    const move = (e: globalThis.PointerEvent) =>
      onResize(column.key, Math.max(MIN_COLUMN_WIDTH, Math.round(width + e.clientX - startX)))
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
      document.body.classList.remove('is-resizing-column')
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }

  let className = 'hcell'
  if (column.align === 'right') className += ' hcell--right'
  if (pinned) className += ' hcell--pinned'
  if (sortDirection) className += ' is-sorted'

  return (
    <div role="columnheader" aria-sort={ariaSort} className={className} style={CELL_STYLE[column.key]}>
      {/* Header buttons stay out of the tab order: the grid is one tab stop, and S / P act on the focused column. */}
      <button
        type="button"
        tabIndex={-1}
        className="hcell__sort"
        onClick={() => onSort(column.key)}
        title={`${column.label}: click to ${nextAction} (S)`}
      >
        <span className="hcell__label">{column.label}</span>
        {sortDirection === 'asc' && <ArrowUpIcon size={12} />}
        {sortDirection === 'desc' && <ArrowDownIcon size={12} />}
      </button>
      <button
        type="button"
        tabIndex={-1}
        className="hcell__pin"
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${column.label}` : `Pin ${column.label}`}
        title={pinned ? 'Unpin column (P)' : 'Pin column to the left (P)'}
        onClick={() => onPin(column.key)}
      >
        <PinIcon size={12} />
      </button>
      <div
        className="hcell__resize"
        aria-hidden="true"
        title="Drag to resize, double-click to reset"
        onPointerDown={startResize}
        onDoubleClick={() => onResetWidth(column.key)}
      />
    </div>
  )
})
