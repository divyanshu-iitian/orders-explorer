import { useCallback, useMemo, useState } from 'react'
import type { FieldKey } from '../data/fields'
import { buildOrderIndex } from '../data/orderIndex'
import type { NormalizeReport, Order } from '../data/types'
import { COLUMNS, DEFAULT_WIDTHS } from '../grid/columns'
import { DataGrid } from '../grid/DataGrid'
import { nextSort, sortPositions, type SortState } from '../grid/sort'
import { buildRows } from './rows'

interface ExplorerProps {
  orders: readonly Order[]
  report: NormalizeReport
}

export function Explorer({ orders }: ExplorerProps) {
  const index = useMemo(() => buildOrderIndex(orders), [orders])
  const [sort, setSort] = useState<SortState | null>(null)

  const sortedOrder = useMemo(() => (sort ? sortPositions(index, sort) : null), [index, sort])
  const rows = useMemo(() => buildRows(index.size, sortedOrder, null), [index.size, sortedOrder])

  const onSort = useCallback((key: FieldKey) => setSort((current) => nextSort(current, key)), [])

  return (
    <DataGrid
      orders={orders}
      rows={rows}
      columns={COLUMNS}
      widths={DEFAULT_WIDTHS}
      sort={sort}
      onSort={onSort}
      empty={null}
    />
  )
}
