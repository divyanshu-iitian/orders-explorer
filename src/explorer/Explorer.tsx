import { useMemo } from 'react'
import type { NormalizeReport, Order } from '../data/types'
import { COLUMNS, DEFAULT_WIDTHS } from '../grid/columns'
import { DataGrid } from '../grid/DataGrid'

interface ExplorerProps {
  orders: readonly Order[]
  report: NormalizeReport
}

export function Explorer({ orders }: ExplorerProps) {
  const rows = useMemo(() => Int32Array.from(orders, (_, i) => i), [orders])
  return <DataGrid orders={orders} rows={rows} columns={COLUMNS} widths={DEFAULT_WIDTHS} empty={null} />
}
