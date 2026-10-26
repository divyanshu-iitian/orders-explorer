import type { NormalizeReport, Order } from './types'

export interface LoaderRequest {
  url: string
}

export type LoaderResponse =
  | { type: 'progress'; loaded: number; total: number | null }
  | { type: 'parsing' }
  | { type: 'done'; orders: Order[]; report: NormalizeReport }
  | { type: 'error'; message: string }
