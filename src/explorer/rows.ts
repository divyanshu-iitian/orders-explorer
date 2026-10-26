/**
 * The rows the grid shows: positions into the orders array, in display order.
 * `order` is a pre-sorted list of all positions (or null for file order) and
 * `matches` the compiled filter (or null for no filter). One linear pass, so a
 * new filter never has to re-sort.
 */
export function buildRows(
  size: number,
  order: Int32Array | null,
  matches: ((i: number) => boolean) | null,
): Int32Array {
  if (!matches) return order ?? Int32Array.from({ length: size }, (_, i) => i)

  const out = new Int32Array(size)
  let n = 0
  for (let k = 0; k < size; k++) {
    const i = order ? order[k] : k
    if (matches(i)) out[n++] = i
  }
  return out.slice(0, n)
}
