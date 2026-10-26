import { memo, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { FieldKey } from '../data/fields'
import type { Order } from '../data/types'
import { CELL_STYLE, type Column, type ColumnWidths } from './columns'
import { HeaderCell } from './HeaderCell'
import type { SortState } from './sort'
import { useVirtualRows } from './useVirtualRows'
import './DataGrid.css'

export const ROW_HEIGHT = 28
export const HEADER_HEIGHT = 32

interface DataGridProps {
  orders: readonly Order[]
  /** Positions into `orders`, in display order. */
  rows: Int32Array
  columns: readonly Column[]
  widths: ColumnWidths
  sort: SortState | null
  onSort: (key: FieldKey) => void
  /** Shown under the header when there are no rows. */
  empty: ReactNode
}

export function DataGrid({ orders, rows, columns, widths, sort, onSort, empty }: DataGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { start, end, onScroll } = useVirtualRows(scrollerRef, {
    rowCount: rows.length,
    rowHeight: ROW_HEIGHT,
    headerHeight: HEADER_HEIGHT,
  })

  const totalWidth = columns.reduce((sum, c) => sum + widths[c.key], 0)
  const gridStyle = useMemo(() => {
    const style: Record<string, string> = { '--grid-w': `${totalWidth}px` }
    for (const c of columns) style[`--w-${c.key}`] = `${widths[c.key]}px`
    return style as CSSProperties
  }, [columns, widths, totalWidth])

  const visible: ReactNode[] = []
  for (let i = start; i < end; i++) {
    visible.push(<Row key={i} index={i} order={orders[rows[i]]} columns={columns} />)
  }

  return (
    <div className="grid-wrap">
      <div
        ref={scrollerRef}
        className="grid"
        style={gridStyle}
        role="grid"
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
        onScroll={onScroll}
      >
        <div className="grid__canvas" style={{ height: HEADER_HEIGHT + rows.length * ROW_HEIGHT }}>
          <div className="grid__header" role="row" aria-rowindex={1}>
            {columns.map((column) => (
              <HeaderCell
                key={column.key}
                column={column}
                sortDirection={sort?.key === column.key ? sort.direction : null}
                onSort={onSort}
              />
            ))}
          </div>
          {visible}
        </div>
      </div>
      {rows.length === 0 && <div className="grid__empty">{empty}</div>}
    </div>
  )
}

interface RowProps {
  index: number
  order: Order
  columns: readonly Column[]
}

const Row = memo(function Row({ index, order, columns }: RowProps) {
  return (
    <div className="grid__row" role="row" aria-rowindex={index + 2} style={{ top: HEADER_HEIGHT + index * ROW_HEIGHT }}>
      {columns.map((column) => {
        const text = column.text(order)
        return (
          <div
            key={column.key}
            role="gridcell"
            className={cellClass(column)}
            style={CELL_STYLE[column.key]}
            title={column.truncate ? text : undefined}
          >
            {column.render ? column.render(order) : text}
          </div>
        )
      })}
    </div>
  )
})

function cellClass(column: Column): string {
  let name = 'gcell'
  if (column.align === 'right') name += ' gcell--right'
  if (column.mono) name += ' gcell--mono'
  return name
}
