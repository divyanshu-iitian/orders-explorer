import './App.css'
import { LoadError, Loading } from './components/LoadState'
import { useOrders } from './data/useOrders'
import { formatCount } from './lib/format'

export function App() {
  const data = useOrders()

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="topbar__title">Orders Explorer</h1>
        {data.status === 'ready' && (
          <span className="topbar__count">{formatCount(data.orders.length)} orders</span>
        )}
      </header>
      <main className="workspace" aria-busy={data.status === 'loading'}>
        {data.status === 'loading' && <Loading phase={data.phase} progress={data.progress} />}
        {data.status === 'error' && <LoadError message={data.message} onRetry={data.retry} />}
      </main>
    </div>
  )
}
