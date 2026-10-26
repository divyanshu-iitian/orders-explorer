import { useEffect } from 'react'
import { serializeViewState, type ViewState } from './urlState'

const DELAY_MS = 150

/**
 * Mirrors the view into the address bar. replaceState rather than pushState:
 * every keystroke in a filter would otherwise become a Back-button step.
 * Debounced so typing does not rewrite the URL on each key.
 */
export function useUrlSync(state: ViewState) {
  const { filter, sort, pinned, selection } = state

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = serializeViewState({ filter, sort, pinned, selection })
      const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`
      if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', url)
    }, DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [filter, sort, pinned, selection])
}
