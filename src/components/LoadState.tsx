import './LoadState.css'

interface LoadingProps {
  phase: 'download' | 'parse'
  progress: number | null
}

export function Loading({ phase, progress }: LoadingProps) {
  const label = phase === 'download' ? 'Downloading orders…' : 'Cleaning up 50,000 orders…'
  return (
    <div className="load-state" role="status" aria-live="polite">
      <div className="load-state__skeleton" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ width: `${92 - (i % 3) * 9}%` }} />
        ))}
      </div>
      <p className="load-state__title">{label}</p>
      <div
        className="load-state__bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress === null ? undefined : Math.round(progress * 100)}
      >
        <span
          className={progress === null ? 'is-indeterminate' : undefined}
          style={progress === null ? undefined : { width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

interface LoadErrorProps {
  message: string
  onRetry: () => void
}

export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div className="load-state" role="alert">
      <p className="load-state__title">Couldn’t load orders</p>
      <p className="load-state__detail">{message}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry} autoFocus>
        Try again
      </button>
    </div>
  )
}
