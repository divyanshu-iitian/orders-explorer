const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const EMPTY = '—'

/** ₹1,23,456.50 */
export function formatAmount(rupees: number | null): string {
  return rupees === null ? EMPTY : inr.format(rupees)
}

/** ₹5,000 or ₹5,000.5: for chips, where trailing zeros are noise. */
export function formatAmountShort(rupees: number): string {
  return `₹${plain.format(rupees)}`
}

export function formatCount(n: number): string {
  return integer.format(n)
}

export function formatNumber(n: number | null): string {
  return n === null ? EMPTY : plain.format(n)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "14 Mar 2025 09:30", always in UTC. */
export function formatDateTime(ms: number | null): string {
  if (ms === null) return EMPTY
  const d = new Date(ms)
  return `${formatDate(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** "14 Mar 2025", always in UTC. */
export function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "2025-03-14T09:30:00Z": for the CSV, where tools need to parse it back. */
export function toIsoUtc(ms: number | null): string {
  if (ms === null) return ''
  return new Date(ms).toISOString().replace('.000Z', 'Z')
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`
}
