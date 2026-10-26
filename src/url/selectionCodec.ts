/**
 * Selected order ids in the URL. 200 ids written out would be ~2.6 KB and
 * "select all" would be ~650 KB, so ids are stored by number:
 *
 *   r1-40.97.120-200   ranges of order numbers ("r" prefix), good for runs
 *   b<base64url>       a bitset over order numbers, good for large scattered picks
 *
 * Short range lists are kept as they are (readable); otherwise the encoder
 * writes whichever form is shorter. Ids that don't follow the ORD-0000000
 * pattern fall back to a plain JSON list ("j" prefix).
 */

const ID_PATTERN = /^ORD-(\d{7})$/
const MAX_ORDER_NUMBER = 9_999_999
const MAX_SELECTED = 1_000_000

const toNumber = (id: string) => {
  const m = ID_PATTERN.exec(id)
  return m ? Number(m[1]) : null
}
const toId = (n: number) => `ORD-${String(n).padStart(7, '0')}`

export function encodeSelection(ids: Iterable<string>): string {
  const list = [...ids]
  if (list.length === 0) return ''
  const numbers = list.map(toNumber)
  if (numbers.some((n) => n === null)) return `j${JSON.stringify(list)}`

  const sorted = [...new Set(numbers as number[])].sort((a, b) => a - b)
  const ranges = `r${encodeRanges(sorted)}`
  // Short range lists stay readable in the address bar. A bitset costs ~max/6
  // characters whatever the count, so only compute it when it can win.
  if (ranges.length <= 64 || sorted[sorted.length - 1] / 6 >= ranges.length) return ranges
  const bits = `b${encodeBitset(sorted)}`
  return bits.length < ranges.length ? bits : ranges
}

/** Returns the ids, or null if the value is not a selection this app wrote. */
export function decodeSelection(value: string): string[] | null {
  if (value === '') return []
  const kind = value[0]
  const body = value.slice(1)
  if (kind === 'r') return decodeRanges(body)
  if (kind === 'b') return decodeBitset(body)
  if (kind === 'j') {
    try {
      const list: unknown = JSON.parse(body)
      if (Array.isArray(list) && list.length <= MAX_SELECTED && list.every((x) => typeof x === 'string')) {
        return list as string[]
      }
    } catch {
      // fall through
    }
  }
  return null
}

function encodeRanges(sorted: number[]): string {
  const parts: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++
    parts.push(sorted[i] === start ? `${start}` : `${start}-${sorted[i]}`)
  }
  return parts.join('.')
}

function decodeRanges(body: string): string[] | null {
  const ids: string[] = []
  for (const part of body.split('.')) {
    const m = /^(\d{1,7})(?:-(\d{1,7}))?$/.exec(part)
    if (!m) return null
    const from = Number(m[1])
    const to = m[2] === undefined ? from : Number(m[2])
    if (to < from || ids.length + (to - from) >= MAX_SELECTED) return null
    for (let n = from; n <= to; n++) ids.push(toId(n))
  }
  return ids
}

function encodeBitset(sorted: number[]): string {
  const bytes = new Uint8Array((sorted[sorted.length - 1] >> 3) + 1)
  for (const n of sorted) bytes[n >> 3] |= 1 << (n & 7)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBitset(body: string): string[] | null {
  if (!/^[A-Za-z0-9_-]*$/.test(body) || body.length > ((MAX_ORDER_NUMBER >> 3) * 4) / 3 + 4) return null
  let binary: string
  try {
    binary = atob(body.replace(/-/g, '+').replace(/_/g, '/'))
  } catch {
    return null
  }
  const ids: string[] = []
  for (let byte = 0; byte < binary.length; byte++) {
    const bits = binary.charCodeAt(byte)
    if (bits === 0) continue
    for (let bit = 0; bit < 8; bit++) if (bits & (1 << bit)) ids.push(toId(byte * 8 + bit))
  }
  return ids
}
