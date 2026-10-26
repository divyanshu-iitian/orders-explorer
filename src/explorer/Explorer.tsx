import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { DetailsPanel } from '../components/DetailsPanel'
import { LinkProblems } from '../components/LinkProblems'
import { DownloadIcon } from '../components/icons'
import { NoResults } from '../components/NoResults'
import { ShortcutsDialog } from '../components/ShortcutsDialog'
import { Topbar } from '../components/Topbar'
import type { FieldKey } from '../data/fields'
import { buildOrderIndex } from '../data/orderIndex'
import type { NormalizeReport, Order } from '../data/types'
import { downloadCsv, exportFileName, ordersToCsv } from '../export/csv'
import { compileFilter } from '../filters/compile'
import { FilterChips } from '../filters/FilterChips'
import { FilterPanel } from '../filters/FilterPanel'
import { removeCondition, type Filter } from '../filters/model'
import { COLUMN_BY_KEY, COLUMNS } from '../grid/columns'
import { DataGrid, type GridFocus } from '../grid/DataGrid'
import { countVisible, toggleId, type Selection } from '../grid/selection'
import { nextSort, sortPositions, type SortState } from '../grid/sort'
import { formatCount } from '../lib/format'
import { readStored, writeStored } from '../lib/storage'
import { parseViewState } from '../url/urlState'
import { useUrlSync } from '../url/useUrlSync'
import { buildRows } from './rows'
import { useColumnWidths } from './useColumnWidths'

interface ExplorerProps {
  orders: readonly Order[]
  report: NormalizeReport
}

export function Explorer({ orders, report }: ExplorerProps) {
  const index = useMemo(() => buildOrderIndex(orders), [orders])
  // The link is read once, after the data is in, so selected ids can be checked against it.
  const [initial] = useState(() => parseViewState(location.search, (id) => index.positionById.has(id)))
  const [linkProblems, setLinkProblems] = useState(initial.problems)
  const [filter, setFilter] = useState<Filter>(initial.state.filter)
  const [sort, setSort] = useState<SortState | null>(initial.state.sort)
  const [pinned, setPinned] = useState<FieldKey | null>(initial.state.pinned)
  const [selection, setSelection] = useState<Selection>(initial.state.selection)
  const [focus, setFocus] = useState<GridFocus>({ row: 0, col: 'id' })
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => readStored('filters-collapsed') === true)
  const [filterFocusRequest, setFilterFocusRequest] = useState(0)
  const { widths, resize, reset } = useColumnWidths()
  const gridAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => writeStored('filters-collapsed', filtersCollapsed), [filtersCollapsed])
  useUrlSync({ filter, sort, pinned, selection })

  // The pinned column moves to the far left, where it can stick while the rest scroll.
  const columns = useMemo(
    () => (pinned ? [COLUMN_BY_KEY[pinned], ...COLUMNS.filter((c) => c.key !== pinned)] : COLUMNS),
    [pinned],
  )

  // Inputs update `filter` on every keystroke; the grid follows a deferred copy,
  // so React can keep typing responsive and drop stale intermediate results.
  const deferredFilter = useDeferredValue(filter)
  const compiled = useMemo(() => compileFilter(deferredFilter, index), [deferredFilter, index])
  const sortedOrder = useMemo(() => (sort ? sortPositions(index, sort) : null), [index, sort])
  const rows = useMemo(() => buildRows(index.size, sortedOrder, compiled.test), [index.size, sortedOrder, compiled])

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

  // Export takes the selected orders the user can currently see, in the grid's
  // order, so it always matches the "N selected" count. See README.
  const [exportNotice, setExportNotice] = useState('')
  const exportSelection = () => {
    const picked: Order[] = []
    for (const position of rows) {
      const order = orders[position]
      if (selection.has(order.id)) picked.push(order)
    }
    if (picked.length === 0) return
    const fileName = exportFileName(picked.length)
    downloadCsv(fileName, ordersToCsv(picked))
    setExportNotice(`Exported ${formatCount(picked.length)} ${picked.length === 1 ? 'order' : 'orders'} to ${fileName}`)
  }
  useEffect(() => {
    if (!exportNotice) return
    const timer = window.setTimeout(() => setExportNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [exportNotice])

  const focusedOrder = rows.length > 0 ? orders[rows[Math.min(focus.row, rows.length - 1)]] : null

  const onSort = useCallback((key: FieldKey) => setSort((current) => nextSort(current, key)), [])
  const onPin = useCallback((key: FieldKey) => setPinned((current) => (current === key ? null : key)), [])
  const openDetails = useCallback(() => setDetailsOpen(true), [])
  const clearFilters = useCallback(() => setFilter([]), [])
  const focusGrid = useCallback(() => gridAreaRef.current?.querySelector<HTMLElement>('[role="grid"]')?.focus(), [])

  // Keyboard users land in the grid and can start moving straight away.
  useEffect(() => focusGrid(), [focusGrid])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsOpen) {
        setDetailsOpen(false)
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return
      if (event.key === '/') {
        event.preventDefault()
        setFiltersCollapsed(false)
        setFilterFocusRequest((n) => n + 1)
      } else if (event.key === '?') {
        event.preventDefault()
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailsOpen])

  return (
    <div className="app">
      <Topbar>
        <span className={`topbar__count${filter !== deferredFilter ? ' is-updating' : ''}`} aria-live="polite">
          <strong>{formatCount(rows.length)}</strong> of {formatCount(orders.length)} orders
        </span>
        {selection.size > 0 && (
          <span className="topbar__selection">
            <strong>{formatCount(selectedInView)}</strong> selected
            {selectedHidden > 0 && (
              <span
                className="muted"
                title="These stay selected but are not counted or exported while the current filters hide them."
              >
                · {formatCount(selectedHidden)} more hidden by filters
              </span>
            )}
            <button type="button" className="btn btn--link" onClick={() => setSelection(new Set())}>
              Clear
            </button>
          </span>
        )}
        <span className="topbar__spacer" />
        <span className="topbar__notice" role="status">
          {exportNotice}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={exportSelection}
          disabled={selectedInView === 0}
          title={selectedInView === 0 ? 'Select rows to export them' : 'Download the selected rows as CSV'}
        >
          <DownloadIcon /> Export {selectedInView > 0 ? formatCount(selectedInView) : ''} to CSV
        </button>
      </Topbar>

      {linkProblems.length > 0 && <LinkProblems problems={linkProblems} onDismiss={() => setLinkProblems([])} />}

      <FilterChips
        filter={filter}
        onRemove={(id) => setFilter((f) => removeCondition(f, id))}
        onClearAll={clearFilters}
      />

      <main className="workspace" aria-busy="false">
        <FilterPanel
          filter={filter}
          onChange={setFilter}
          activeCount={compiled.activeCount}
          collapsed={filtersCollapsed}
          onCollapsedChange={setFiltersCollapsed}
          focusRequest={filterFocusRequest}
          onExit={focusGrid}
        />
        <div className="grid-area" ref={gridAreaRef}>
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
            empty={<NoResults activeCount={compiled.activeCount} onClearFilters={clearFilters} />}
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

      <footer className="statusbar">
        <span className="statusbar__hints">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd> move <kbd>Enter</kbd> details <kbd>Space</kbd> select <kbd>/</kbd> filters
          <button type="button" className="btn btn--link" onClick={() => setHelpOpen(true)}>
            All shortcuts <kbd>?</kbd>
          </button>
        </span>
        <span
          className="statusbar__data"
          title="Records with the same order id are merged as described in data-notes.md"
        >
          {formatCount(report.read)} records in orders.json · {formatCount(report.duplicatesRemoved)} duplicate ids
          merged
        </span>
      </footer>

      {helpOpen && (
        <ShortcutsDialog
          onClose={() => {
            setHelpOpen(false)
            focusGrid()
          }}
        />
      )}
    </div>
  )
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}
