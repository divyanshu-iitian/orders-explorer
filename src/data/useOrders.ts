import { useCallback, useEffect, useState } from 'react'
import type { LoaderRequest, LoaderResponse } from './loaderProtocol'
import type { NormalizeReport, Order } from './types'

export type OrdersState =
  | { status: 'loading'; phase: 'download' | 'parse'; progress: number | null }
  | { status: 'ready'; orders: Order[]; report: NormalizeReport }
  | { status: 'error'; message: string }

const DATA_URL = `${import.meta.env.BASE_URL}orders.json`

export function useOrders(): OrdersState & { retry: () => void } {
  const [state, setState] = useState<OrdersState>({ status: 'loading', phase: 'download', progress: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const worker = new Worker(new URL('./loader.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<LoaderResponse>) => {
      const message = event.data
      switch (message.type) {
        case 'progress':
          setState({
            status: 'loading',
            phase: 'download',
            progress: message.total ? message.loaded / message.total : null,
          })
          break
        case 'parsing':
          setState({ status: 'loading', phase: 'parse', progress: null })
          break
        case 'done':
          setState({ status: 'ready', orders: message.orders, report: message.report })
          worker.terminate()
          break
        case 'error':
          setState({ status: 'error', message: message.message })
          worker.terminate()
          break
      }
    }
    worker.onerror = (event) => {
      setState({ status: 'error', message: event.message || 'The data loader stopped unexpectedly.' })
      worker.terminate()
    }

    const request: LoaderRequest = { url: new URL(DATA_URL, location.href).href }
    worker.postMessage(request)
    return () => worker.terminate()
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading', phase: 'download', progress: null })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
