import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { FieldKey } from '../data/fields'
import type { Order } from '../data/types'
import { CELL_STYLE, type Column, type ColumnWidths } from './columns'
import { HeaderCell } from './HeaderCell'
import { setRange, toggleId, type Selection } from './selection'
import type { SortState } from './sort'
import { useVirtualRows } from './useVirtualRows'
import './DataGrid.css'

export const ROW_HEIGHT = 28
export const HEADER_HEIGHT = 32
const CHECK_WIDTH = 32

export interface GridFocus {
  /** Index into the current rows. */
  row: number
  /** Tracked by field rather than position, so pinning a column does not move focus. */
  col: FieldKey
}

interface DataGridProps {
  orders: readonly Order[]
  /** Positions into `orders`, in display order. */
  rows: Int32Array
  columns: readonly Column[]
  widths: ColumnWidths
  sort: SortState | null
  onSort: (key: FieldKey) => void
  pinned: FieldKey | null
  onPin: (key: FieldKey) => void
  onResize: (key: FieldKey, width: number) => void
  onResetWidth: (key: FieldKey) => void
  selection: Selection
  /** How many of the current rows are selected; drives the header checkbox. */
  selectedInView: number
  onSelectionChange: (next: Selection) => void
  focus: GridFocus
  onFocusChange: (focus: GridFocus) => void
  onOpenDetails: () => void
  /** Shown under the header when there are no rows. */
  empty: ReactNode
}

export function DataGrid(props: DataGridProps) {
  const { orders, rows, columns, widths, sort, pinned, selection, selectedInView, focus, empty } = props
  const { onSort, onPin, onResize, onResetWidth, onSelectionChange, onFocusChange, onOpenDetails } = props

  const scrollerRef = useRef<HTMLDivElement>(null)
  const cellIdPrefix = useId()
  const {
    start,
    end,
    bodyHeight,
    onScroll: onVirtualScroll,
  } = useVirtualRows(scrollerRef, {
    rowCount: rows.length,
    rowHeight: ROW_HEIGHT,
    headerHeight: HEADER_HEIGHT,
  })

  // Drives the shadow on the pinned column once content slides under it.
  const [scrolledX, setScrolledX] = useState(false)
  const onScroll = useCallback(() => {
    onVirtualScroll()
    setScrolledX((scrollerRef.current?.scrollLeft ?? 0) > 0)
  }, [onVirtualScroll])

  // A new filter or sort starts the user at the top of the new result.
  useLayoutEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0
  }, [rows])

  const totalWidth = CHECK_WIDTH + columns.reduce((sum, c) => sum + widths[c.key], 0)
  const gridStyle = useMemo(() => {
    const style: Record<string, string> = {
      '--grid-w': `${totalWidth}px`,
      '--check-w': `${CHECK_WIDTH}px`,
      '--pin-left': `${CHECK_WIDTH}px`,
    }
    for (const c of columns) style[`--w-${c.key}`] = `${widths[c.key]}px`
    return style as CSSProperties
  }, [columns, widths, totalWidth])

  // ---- focus ----

  const focusRow = Math.min(focus.row, rows.length - 1)
  const focusColIndex = Math.max(
    0,
    columns.findIndex((c) => c.key === focus.col),
  )
  const scrollToFocus = useRef(false)

  useLayoutEffect(() => {
    if (!scrollToFocus.current) return
    scrollToFocus.current = false
    const el = scrollerRef.current
    if (!el || focusRow < 0) return

    const top = focusRow * ROW_HEIGHT
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + ROW_HEIGHT > el.scrollTop + bodyHeight) el.scrollTop = top + ROW_HEIGHT - bodyHeight

    const column = columns[focusColIndex]
    if (column.key === pinned) return
    let left = CHECK_WIDTH
    for (let i = 0; i < focusColIndex; i++) left += widths[columns[i].key]
    const stuck = CHECK_WIDTH + (pinned ? widths[pinned] : 0)
    const width = widths[column.key]
    if (left < el.scrollLeft + stuck) el.scrollLeft = left - stuck
    else if (left + width > el.scrollLeft + el.clientWidth) el.scrollLeft = left + width - el.clientWidth
  }, [focusRow, focusColIndex, columns, widths, pinned, bodyHeight])

  const moveFocus = (row: number, colIndex: number) => {
    scrollToFocus.current = true
    onFocusChange({
      row: clamp(row, 0, rows.length - 1),
      col: columns[clamp(colIndex, 0, columns.length - 1)].key,
    })
  }

  // ---- selection ----

  // The row a shift+click range starts from: the last row clicked or toggled.
  const anchor = useRef<number | null>(null)

  const idAt = (row: number) => orders[rows[row]].id

  const toggleAllInView = () => {
    const selectAll = selectedInView < rows.length
    onSelectionChange(setRange(selection, orders, rows, 0, rows.length - 1, selectAll))
  }

  const selectFromClick = (row: number, shift: boolean) => {
    if (shift && anchor.current !== null && anchor.current < rows.length) {
      onSelectionChange(setRange(selection, orders, rows, anchor.current, row))
    } else {
      onSelectionChange(toggleId(selection, idAt(row)))
    }
    anchor.current = row
  }

  // ---- mouse (one delegated handler instead of one per cell) ----

  const targetRow = (event: MouseEvent) => {
    const rowEl = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
    return rowEl ? Number(rowEl.dataset.row) : null
  }

  const onMouseDown = (event: MouseEvent) => {
    // Shift+click would otherwise highlight text across the rows.
    if (event.shiftKey && targetRow(event) !== null) event.preventDefault()
  }

  const onClick = (event: MouseEvent) => {
    const row = targetRow(event)
    if (row === null) return
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-col]')
    onFocusChange({ row, col: (cell?.dataset.col as FieldKey | undefined) ?? focus.col })
    selectFromClick(row, event.shiftKey)
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (targetRow(event) !== null) onOpenDetails()
  }

  // ---- keyboard ----

  const onKeyDown = (event: KeyboardEvent) => {
    const mod = event.ctrlKey || event.metaKey
    const key = event.key

    if (mod && key.toLowerCase() === 'a') {
      event.preventDefault()
      if (rows.length) toggleAllInView()
      return
    }
    if (rows.length === 0 || event.altKey) return

    const page = Math.max(1, Math.floor(bodyHeight / ROW_HEIGHT) - 1)
    const lastRow = rows.length - 1
    const lastCol = columns.length - 1
    let row = focusRow
    let col = focusColIndex

    switch (key) {
      case 'ArrowDown':
        row = mod ? lastRow : row + 1
        break
      case 'ArrowUp':
        row = mod ? 0 : row - 1
        break
      case 'ArrowRight':
        col = mod ? lastCol : col + 1
        break
      case 'ArrowLeft':
        col = mod ? 0 : col - 1
        break
      case 'Home':
        col = 0
        if (mod) row = 0
        break
      case 'End':
        col = lastCol
        if (mod) row = lastRow
        break
      case 'PageDown':
        row += page
        break
      case 'PageUp':
        row -= page
        break
      case 'Enter':
        event.preventDefault()
        onOpenDetails()
        return
      case ' ':
        event.preventDefault()
        onSelectionChange(toggleId(selection, idAt(focusRow)))
        anchor.current = focusRow
        return
      default:
        if (mod || event.shiftKey) return
        if (key.toLowerCase() === 's') onSort(columns[focusColIndex].key)
        else if (key.toLowerCase() === 'p') onPin(columns[focusColIndex].key)
        return
    }

    event.preventDefault()
    row = clamp(row, 0, lastRow)
    if (event.shiftKey && row !== focusRow) {
      onSelectionChange(setRange(selection, orders, rows, focusRow, row))
      anchor.current = row
    }
    moveFocus(row, col)
  }

  // ---- render ----

  const focusedColKey = columns[focusColIndex]?.key
  const visible: ReactNode[] = []
  for (let i = start; i < end; i++) {
    const order = orders[rows[i]]
    visible.push(
      <Row
        key={i}
        index={i}
        order={order}
        columns={columns}
        pinned={pinned}
        selected={selection.has(order.id)}
        focusedCol={i === focusRow ? focusedColKey : null}
        idPrefix={cellIdPrefix}
      />,
    )
  }

  const activeCellId = focusRow >= start && focusRow < end ? cellId(cellIdPrefix, focusRow, focusedColKey) : undefined
  const allSelected = rows.length > 0 && selectedInView === rows.length

  return (
    <div className="grid-wrap">
      <div
        ref={scrollerRef}
        className={scrolledX ? 'grid is-scrolled-x' : 'grid'}
        style={gridStyle}
        role="grid"
        aria-label="Orders"
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length + 1}
        aria-multiselectable="true"
        aria-activedescendant={activeCellId}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div className="grid__canvas" style={{ height: HEADER_HEIGHT + rows.length * ROW_HEIGHT }}>
          <div className="grid__header" role="row" aria-rowindex={1}>
            <div role="columnheader" className="hcell hcell--check">
              <input
                type="checkbox"
                tabIndex={-1}
                aria-label="Select all shown orders (Ctrl+A)"
                title="Select all shown orders (Ctrl+A)"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selectedInView > 0 && !allSelected
                }}
                disabled={rows.length === 0}
                onChange={toggleAllInView}
              />
            </div>
            {columns.map((column) => (
              <HeaderCell
                key={column.key}
                column={column}
                width={widths[column.key]}
                sortDirection={sort?.key === column.key ? sort.direction : null}
                pinned={pinned === column.key}
                onSort={onSort}
                onPin={onPin}
                onResize={onResize}
                onResetWidth={onResetWidth}
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
  pinned: FieldKey | null
  selected: boolean
  /** The focused column if this row holds the focused cell, otherwise null. */
  focusedCol: FieldKey | null
  idPrefix: string
}

const Row = memo(function Row({ index, order, columns, pinned, selected, focusedCol, idPrefix }: RowProps) {
  let className = 'grid__row'
  if (selected) className += ' is-selected'
  if (focusedCol) className += ' is-focus-row'

  return (
    <div
      className={className}
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      data-row={index}
      style={{ top: HEADER_HEIGHT + index * ROW_HEIGHT }}
    >
      <div role="gridcell" className="gcell gcell--check">
        <span className="check" aria-hidden="true" />
      </div>
      {columns.map((column) => {
        const text = column.text(order)
        return (
          <div
            key={column.key}
            id={cellId(idPrefix, index, column.key)}
            role="gridcell"
            className={cellClass(column, column.key === pinned, column.key === focusedCol)}
            style={CELL_STYLE[column.key]}
            title={column.truncate ? text : undefined}
            data-col={column.key}
          >
            {column.render ? column.render(order) : text}
          </div>
        )
      })}
    </div>
  )
})

function cellClass(column: Column, pinned: boolean, focused: boolean): string {
  let name = 'gcell'
  if (pinned) name += ' gcell--pinned'
  if (column.align === 'right') name += ' gcell--right'
  if (column.numeric) name += ' gcell--numeric'
  if (focused) name += ' is-focused'
  return name
}

function cellId(prefix: string, row: number, col: FieldKey) {
  return `${prefix}-r${row}-${col}`
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
