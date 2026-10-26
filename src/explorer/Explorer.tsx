import { useCallback, useMemo, useState } from 'react'
import type { FieldKey } from '../data/fields'
import { buildOrderIndex } from '../data/orderIndex'
import type { NormalizeReport, Order } from '../data/types'
import { COLUMN_BY_KEY, COLUMNS } from '../grid/columns'
import { DataGrid } from '../grid/DataGrid'
import { nextSort, sortPositions, type SortState } from '../grid/sort'
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
  const { widths, resize, reset } = useColumnWidths()

  // The pinned column moves to the far left, where it can stick while the rest scroll.
  const columns = useMemo(
    () => (pinned ? [COLUMN_BY_KEY[pinned], ...COLUMNS.filter((c) => c.key !== pinned)] : COLUMNS),
    [pinned],
  )

  const sortedOrder = useMemo(() => (sort ? sortPositions(index, sort) : null), [index, sort])
  const rows = useMemo(() => buildRows(index.size, sortedOrder, null), [index.size, sortedOrder])

  const onSort = useCallback((key: FieldKey) => setSort((current) => nextSort(current, key)), [])
  const onPin = useCallback((key: FieldKey) => setPinned((current) => (current === key ? null : key)), [])

  return (
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
      empty={null}
    />
  )
}
