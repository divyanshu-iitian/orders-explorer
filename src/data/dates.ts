const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const ISO_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/
const DIGITS = /^\d+$/

// Anything below this is taken as epoch seconds, anything above as milliseconds.
// 1e11 seconds is the year 5138, 1e11 ms is 1973, so the two ranges cannot overlap
// for real order data.
const SECONDS_CUTOFF = 1e11

/**
 * Reads the date formats found in orders.json and returns epoch ms (UTC):
 * - ISO with a zone:       "2025-03-14T09:30:00.000Z"
 * - ISO without a zone:    "2025-03-14T09:30:00"  (taken as UTC)
 * - epoch seconds:         1741944600
 * - day/month/year string: "14/03/2025"           (midnight UTC)
 * Returns null for anything it cannot read instead of guessing.
 */
export function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number') return fromEpoch(value)
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (text === '') return null

  const dmy = DAY_MONTH_YEAR.exec(text)
  if (dmy) return utcDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))

  if (DIGITS.test(text)) return fromEpoch(Number(text))

  // Date.parse treats a zone-less ISO date-time as local time; the data notes
  // say it is UTC, so make that explicit.
  const iso = ISO_WITHOUT_ZONE.test(text) ? `${text}Z` : text
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

function fromEpoch(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) return null
  return n < SECONDS_CUTOFF ? n * 1000 : n
}

/** Midnight UTC of a calendar day, or null if the day does not exist (e.g. 31/02). */
export function utcDate(year: number, month: number, day: number): number | null {
  const ms = Date.UTC(year, month - 1, day)
  const d = new Date(ms)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return ms
}

const DAY_MS = 86_400_000

/** "2025-03-14" (the value of <input type="date">) to midnight UTC, or null. */
export function parseDateInput(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  return utcDate(Number(m[1]), Number(m[2]), Number(m[3]))
}

export function endOfUtcDay(startOfDay: number): number {
  return startOfDay + DAY_MS
}
