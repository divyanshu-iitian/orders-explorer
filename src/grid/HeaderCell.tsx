import { memo } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from '../components/icons'
import type { FieldKey } from '../data/fields'
import { CELL_STYLE, type Column } from './columns'
import type { SortDirection } from './sort'

interface HeaderCellProps {
  column: Column
  sortDirection: SortDirection | null
  onSort: (key: FieldKey) => void
}

export const HeaderCell = memo(function HeaderCell({ column, sortDirection, onSort }: HeaderCellProps) {
  const ariaSort = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
  const nextAction =
    sortDirection === null ? 'sort ascending' : sortDirection === 'asc' ? 'sort descending' : 'clear sort'

  let className = 'hcell'
  if (column.align === 'right') className += ' hcell--right'
  if (sortDirection) className += ' is-sorted'

  return (
    <div role="columnheader" aria-sort={ariaSort} className={className} style={CELL_STYLE[column.key]}>
      {/* Not in the tab order: the grid itself is one tab stop, and S sorts the focused column. */}
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
    </div>
  )
})
