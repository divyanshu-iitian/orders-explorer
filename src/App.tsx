import './App.css'
import { LoadError, Loading } from './components/LoadState'
import { Topbar } from './components/Topbar'
import { useOrders } from './data/useOrders'
import { Explorer } from './explorer/Explorer'

export function App() {
  const data = useOrders()

  if (data.status === 'ready') return <Explorer orders={data.orders} report={data.report} />

  return (
    <div className="app">
      <Topbar />
      <main className="workspace" aria-busy={data.status === 'loading'}>
        {data.status === 'loading' ? (
          <Loading phase={data.phase} progress={data.progress} />
        ) : (
          <LoadError message={data.message} onRetry={data.retry} />
        )}
      </main>
    </div>
  )
}
