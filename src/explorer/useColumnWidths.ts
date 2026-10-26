import { useCallback, useEffect, useState } from 'react'
import { isFieldKey, type FieldKey } from '../data/fields'
import { DEFAULT_WIDTHS, MIN_COLUMN_WIDTH, type ColumnWidths } from '../grid/columns'
import { readStored, writeStored } from '../lib/storage'

// Column widths are a personal layout preference rather than part of what a
// shared link shows, so they live in localStorage instead of the URL.
const STORAGE_KEY = 'column-widths'
const MAX_WIDTH = 1200

export function useColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>(loadWidths)

  useEffect(() => writeStored(STORAGE_KEY, widths), [widths])

  const resize = useCallback((key: FieldKey, width: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_COLUMN_WIDTH, width))
    setWidths((current) => (current[key] === clamped ? current : { ...current, [key]: clamped }))
  }, [])

  const reset = useCallback((key: FieldKey) => resize(key, DEFAULT_WIDTHS[key]), [resize])

  return { widths, resize, reset }
}

function loadWidths(): ColumnWidths {
  const widths = { ...DEFAULT_WIDTHS }
  const stored = readStored(STORAGE_KEY)
  if (stored && typeof stored === 'object') {
    for (const [key, value] of Object.entries(stored)) {
      if (isFieldKey(key) && typeof value === 'number' && value >= MIN_COLUMN_WIDTH && value <= MAX_WIDTH) {
        widths[key] = Math.round(value)
      }
    }
  }
  return widths
}
