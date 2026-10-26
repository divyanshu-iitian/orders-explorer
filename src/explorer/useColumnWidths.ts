import { useCallback, useEffect, useState } from 'react'
import { isFieldKey, type FieldKey } from '../data/fields'
import { DEFAULT_WIDTHS, MIN_COLUMN_WIDTH, type ColumnWidths } from '../grid/columns'

// Column widths are a personal layout preference rather than part of what a
// shared link shows, so they live in localStorage instead of the URL.
const STORAGE_KEY = 'orders-explorer:column-widths'
const MAX_WIDTH = 1200

export function useColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>(loadWidths)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
    } catch {
      // Storage can be full or disabled (private mode); widths then last for the session.
    }
  }, [widths])

  const resize = useCallback((key: FieldKey, width: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_COLUMN_WIDTH, width))
    setWidths((current) => (current[key] === clamped ? current : { ...current, [key]: clamped }))
  }, [])

  const reset = useCallback((key: FieldKey) => resize(key, DEFAULT_WIDTHS[key]), [resize])

  return { widths, resize, reset }
}

function loadWidths(): ColumnWidths {
  const widths = { ...DEFAULT_WIDTHS }
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (stored && typeof stored === 'object') {
      for (const [key, value] of Object.entries(stored)) {
        if (isFieldKey(key) && typeof value === 'number' && value >= MIN_COLUMN_WIDTH && value <= MAX_WIDTH) {
          widths[key] = Math.round(value)
        }
      }
    }
  } catch {
    // Unreadable storage: fall back to defaults.
  }
  return widths
}
