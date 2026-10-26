import { describe, expect, it } from 'vitest'
import { parseDateInput, parseTimestamp } from './dates'

const MAR_14_0930 = Date.UTC(2025, 2, 14, 9, 30)

describe('parseTimestamp', () => {
  it('reads ISO with a zone', () => {
    expect(parseTimestamp('2025-03-14T09:30:00.000Z')).toBe(MAR_14_0930)
    expect(parseTimestamp('2025-03-14T15:00:00+05:30')).toBe(MAR_14_0930)
  })

  it('reads ISO without a zone as UTC, not local time', () => {
    expect(parseTimestamp('2025-03-14T09:30:00')).toBe(MAR_14_0930)
    expect(parseTimestamp('2025-03-14T09:30')).toBe(MAR_14_0930)
  })

  it('reads epoch seconds', () => {
    expect(parseTimestamp(1741944600)).toBe(MAR_14_0930)
    expect(parseTimestamp('1741944600')).toBe(MAR_14_0930)
  })

  it('keeps epoch milliseconds as they are', () => {
    expect(parseTimestamp(MAR_14_0930)).toBe(MAR_14_0930)
  })

  it('reads day/month/year as midnight UTC', () => {
    expect(parseTimestamp('14/03/2025')).toBe(Date.UTC(2025, 2, 14))
    expect(parseTimestamp('4/3/2025')).toBe(Date.UTC(2025, 2, 4))
  })

  it('does not read day/month/year as month/day/year', () => {
    expect(parseTimestamp('03/04/2025')).toBe(Date.UTC(2025, 3, 3))
  })

  it('returns null for missing or impossible values', () => {
    expect(parseTimestamp(null)).toBeNull()
    expect(parseTimestamp(undefined)).toBeNull()
    expect(parseTimestamp('')).toBeNull()
    expect(parseTimestamp('soon')).toBeNull()
    expect(parseTimestamp('31/02/2025')).toBeNull()
    expect(parseTimestamp(Number.NaN)).toBeNull()
    expect(parseTimestamp(-5)).toBeNull()
  })
})

describe('parseDateInput', () => {
  it('reads the value of a date input', () => {
    expect(parseDateInput('2025-03-14')).toBe(Date.UTC(2025, 2, 14))
  })

  it('rejects partial or invalid dates', () => {
    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput('2025-3-14')).toBeNull()
    expect(parseDateInput('2025-02-30')).toBeNull()
  })
})
