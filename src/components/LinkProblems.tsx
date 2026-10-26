import { CloseIcon, WarningIcon } from './icons'
import './LinkProblems.css'

interface LinkProblemsProps {
  problems: readonly string[]
  onDismiss: () => void
}

/** Explains which parts of a shared link were unusable and have been reset. */
export function LinkProblems({ problems, onDismiss }: LinkProblemsProps) {
  return (
    <div className="link-problems" role="alert">
      <WarningIcon size={16} />
      <div className="link-problems__text">
        <strong>Some settings in this link couldn’t be used and were reset to their defaults:</strong>
        <ul>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss" title="Dismiss">
        <CloseIcon size={12} />
      </button>
    </div>
  )
}
