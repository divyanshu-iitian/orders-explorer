import { optionLabel } from '../data/fields'
import type { Order } from '../data/types'
import { EMPTY, formatAmount, formatDateTime, formatNumber } from '../lib/format'
import { CloseIcon } from './icons'
import './DetailsPanel.css'

interface DetailsPanelProps {
  order: Order
  selected: boolean
  onToggleSelected: () => void
  onClose: () => void
}

/**
 * Full record for the focused row. It is not modal: focus stays in the grid,
 * so arrow keys keep moving through orders and the panel follows.
 */
export function DetailsPanel({ order, selected, onToggleSelected, onClose }: DetailsPanelProps) {
  const fields: [string, string][] = [
    ['Customer', order.customer || EMPTY],
    ['Email', order.email || EMPTY],
    ['Amount', formatAmount(order.amount)],
    ['Items', formatNumber(order.itemCount)],
    ['Priority', order.priority === null ? 'None' : `P${order.priority}`],
    ['Region', optionLabel('region', order.region) || EMPTY],
    ['Channel', optionLabel('channel', order.channel) || EMPTY],
    ['Payment', optionLabel('paymentMethod', order.paymentMethod) || EMPTY],
    ['Created (UTC)', formatDateTime(order.createdAt)],
    ['Updated (UTC)', formatDateTime(order.updatedAt)],
    ['Source format', `Schema v${order.schemaVersion}`],
  ]

  return (
    <aside className="details" aria-label={`Details for order ${order.id}`}>
      <header className="details__header">
        <h2 className="details__title">{order.id}</h2>
        {order.status && (
          <span className={`status status--${order.status}`}>{optionLabel('status', order.status)}</span>
        )}
        <button
          type="button"
          className="icon-btn details__close"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="details__body">
        <dl className="details__fields">
          {fields.map(([label, value]) => (
            <div key={label} className="details__field">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className="details__notes">
          <h3>Notes</h3>
          {/* Plain text on purpose: notes contain things like <script> from the old system. */}
          {order.notes.trim() ? <p>{order.notes}</p> : <p className="muted">No notes</p>}
        </section>
      </div>

      <footer className="details__footer">
        <button type="button" className="btn" onClick={onToggleSelected}>
          {selected ? 'Unselect' : 'Select'} <kbd>Space</kbd>
        </button>
        <span className="details__hint">
          <kbd>↑</kbd> <kbd>↓</kbd> next order
        </span>
      </footer>
    </aside>
  )
}
