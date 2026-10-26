import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'

interface VirtualRowsOptions {
  rowCount: number
  rowHeight: number
  /** Height of the sticky header inside the scroller, which hides rows under it. */
  headerHeight: number
  overscan?: number
}

/**
 * Works out which rows intersect the scroller's viewport. Only those (plus a
 * few above and below, so fast scrolling does not flash blank rows) are rendered.
 */
export function useVirtualRows(
  scrollerRef: RefObject<HTMLElement | null>,
  { rowCount, rowHeight, headerHeight, overscan = 8 }: VirtualRowsOptions,
) {
  // Tracked as a row number rather than pixels: scrolling within a row does not re-render.
  const [firstRow, setFirstRow] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight))
    observer.observe(el)
    setViewportHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [scrollerRef])

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (el) setFirstRow(Math.floor(el.scrollTop / rowHeight))
  }, [scrollerRef, rowHeight])

  const bodyHeight = Math.max(0, viewportHeight - headerHeight)
  const start = Math.max(0, firstRow - overscan)
  const end = Math.min(rowCount, firstRow + Math.ceil(bodyHeight / rowHeight) + 1 + overscan)

  return { start, end, bodyHeight, onScroll }
}
