import { useCallback, useEffect, useMemo, useState } from 'react'
import { DetailsPanel } from '../components/DetailsPanel'
import { Topbar } from '../components/Topbar'
import type { FieldKey } from '../data/fields'
import { buildOrderIndex } from '../data/orderIndex'
import type { NormalizeReport, Order } from '../data/types'
import { COLUMN_BY_KEY, COLUMNS } from '../grid/columns'
import { DataGrid, type GridFocus } from '../grid/DataGrid'
import { countVisible, toggleId, type Selection } from '../grid/selection'
import { nextSort, sortPositions, type SortState } from '../grid/sort'
import { formatCount } from '../lib/format'
import { buildRows } from './rows'
import { useColumnWidths } from './useColumnWidths'

interface ExplorerProps {
  orders: readonly Order[]
  report: NormalizeReport
}

export function Explorer({ orders }: ExplorerProps) {
  const index = useMemo(() => buildOrderIndex(orders), [orders])
  const [sort, setSort] = useState<SortState | null>(null)
  const [pinned, setPinned] = useState<FieldKey | null>('id')
  const [selection, setSelection] = useState<Selection>(() => new Set())
  const [focus, setFocus] = useState<GridFocus>({ row: 0, col: 'id' })
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { widths, resize, reset } = useColumnWidths()

  // The pinned column moves to the far left, where it can stick while the rest scroll.
  const columns = useMemo(
    () => (pinned ? [COLUMN_BY_KEY[pinned], ...COLUMNS.filter((c) => c.key !== pinned)] : COLUMNS),
    [pinned],
  )

  const sortedOrder = useMemo(() => (sort ? sortPositions(index, sort) : null), [index, sort])
  const rows = useMemo(() => buildRows(index.size, sortedOrder, null), [index.size, sortedOrder])

  // A new result set puts focus back on its first row (the grid scrolls to top too).
  const [focusRows, setFocusRows] = useState(rows)
  if (focusRows !== rows) {
    setFocusRows(rows)
    setFocus((f) => ({ ...f, row: 0 }))
  }

  const visibleMask = useMemo(() => {
    const mask = new Uint8Array(index.size)
    for (const position of rows) mask[position] = 1
    return mask
  }, [rows, index.size])
  const selectedInView = useMemo(
    () => countVisible(selection, visibleMask, index.positionById),
    [selection, visibleMask, index.positionById],
  )
  const selectedHidden = selection.size - selectedInView

  const focusedOrder = rows.length > 0 ? orders[rows[Math.min(focus.row, rows.length - 1)]] : null

  const onSort = useCallback((key: FieldKey) => setSort((current) => nextSort(current, key)), [])
  const onPin = useCallback((key: FieldKey) => setPinned((current) => (current === key ? null : key)), [])
  const openDetails = useCallback(() => setDetailsOpen(true), [])

  useEffect(() => {
    if (!detailsOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailsOpen])

  return (
    <div className="app">
      <Topbar>
        <span className="topbar__count" aria-live="polite">
          <strong>{formatCount(rows.length)}</strong> of {formatCount(orders.length)} orders
        </span>
        {selection.size > 0 && (
          <span className="topbar__selection">
            <strong>{formatCount(selectedInView)}</strong> selected
            {selectedHidden > 0 && <span className="muted"> · {formatCount(selectedHidden)} hidden by filters</span>}
            <button type="button" className="btn btn--link" onClick={() => setSelection(new Set())}>
              Clear
            </button>
          </span>
        )}
      </Topbar>

      <main className="workspace" aria-busy="false">
        <div className="grid-area">
          <DataGrid
            orders={orders}
            rows={rows}
            columns={columns}
            widths={widths}
            sort={sort}
            onSort={onSort}
            pinned={pinned}
            onPin={onPin}
            onResize={resize}
            onResetWidth={reset}
            selection={selection}
            selectedInView={selectedInView}
            onSelectionChange={setSelection}
            focus={focus}
            onFocusChange={setFocus}
            onOpenDetails={openDetails}
            empty={null}
          />
          {detailsOpen && focusedOrder && (
            <DetailsPanel
              order={focusedOrder}
              selected={selection.has(focusedOrder.id)}
              onToggleSelected={() => setSelection((s) => toggleId(s, focusedOrder.id))}
              onClose={() => setDetailsOpen(false)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
