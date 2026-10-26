import { pluralize } from '../lib/format'
import { SearchIcon } from './icons'
import './NoResults.css'

interface NoResultsProps {
  activeCount: number
  onClearFilters: () => void
}

export function NoResults({ activeCount, onClearFilters }: NoResultsProps) {
  return (
    <div className="no-results" role="status">
      <SearchIcon size={28} />
      <h2 className="no-results__title">No orders match these filters</h2>
      <p className="no-results__text">
        {pluralize(activeCount, 'filter')} active. Remove one from the bar above, or start over.
      </p>
      <button type="button" className="btn btn--primary" onClick={onClearFilters}>
        Clear all filters
      </button>
    </div>
  )
}
