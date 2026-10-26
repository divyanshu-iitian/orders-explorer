import { describe, expect, it } from 'vitest'
import { decodeSelection, encodeSelection } from './selectionCodec'
import { parseViewState, serializeViewState, type ViewState } from './urlState'

const id = (n: number) => `ORD-${String(n).padStart(7, '0')}`
const exists = (x: string) => /^ORD-\d{7}$/.test(x) && Number(x.slice(4)) >= 1 && Number(x.slice(4)) <= 50_000

const roundTrip = (state: ViewState) => parseViewState(serializeViewState(state), exists)

const sample: ViewState = {
  filter: [
    {
      id: 'g1',
      conditions: [
        { id: 'c1', field: 'status', operator: 'in', values: ['shipped', 'delivered'] },
        { id: 'c2', field: 'priority', operator: 'in', values: ['none'] },
      ],
    },
    { id: 'g2', conditions: [{ id: 'c3', field: 'amount', operator: 'between', values: ['5,000', '5,000'] }] },
    { id: 'g3', conditions: [{ id: 'c4', field: 'notes', operator: 'contains', values: ['a&b=c "quoted" #1'] }] },
  ],
  sort: { key: 'createdAt', direction: 'desc' },
  pinned: 'customer',
  selection: new Set([id(1), id(2), id(3), id(40)]),
}

describe('URL view state', () => {
  it('round-trips filter, sort, pin and selection', () => {
    const { state, problems } = roundTrip(sample)
    expect(problems).toEqual([])
    expect(state.sort).toEqual(sample.sort)
    expect(state.pinned).toBe('customer')
    expect([...state.selection].sort()).toEqual([...sample.selection].sort())
    const strip = (s: ViewState) =>
      s.filter.map((g) => g.conditions.map(({ field, operator, values }) => [field, operator, values]))
    expect(strip(state)).toEqual(strip(sample))
  })

  it('writes nothing for the default view', () => {
    expect(serializeViewState({ filter: [], sort: null, pinned: 'id', selection: new Set() })).toBe('')
  })

  it('remembers that nothing is pinned', () => {
    expect(roundTrip({ ...sample, pinned: null }).state.pinned).toBeNull()
  })

  it('falls back part by part and says why', () => {
    const { state, problems } = parseViewState('?f=[[["nope","in",[]]]]&sort=-amount&pin=bogus&sel=%%%', exists)
    expect(state.filter).toEqual([])
    expect(state.sort).toEqual({ key: 'amount', direction: 'desc' })
    expect(state.pinned).toBe('id')
    expect(state.selection.size).toBe(0)
    expect(problems).toHaveLength(3)
  })

  it.each([
    ['not JSON', 'f=[[["status"'],
    ['wrong shape', 'f={"a":1}'],
    ['empty group', 'f=[[]]'],
    ['operator for another type', 'f=[[["amount","contains",["5"]]]]'],
    ['unknown enum value', 'f=[[["status","in",["teleported"]]]]'],
    ['missing value', 'f=[[["amount","between",["5"]]]]'],
    ['non-string value', 'f=[[["amount","gt",[5]]]]'],
    ['too many groups', `f=${JSON.stringify(Array.from({ length: 21 }, () => [['id', 'contains', ['x']]]))}`],
  ])('rejects a filter that is %s', (_, query) => {
    const { state, problems } = parseViewState(`?${query}`, exists)
    expect(state.filter).toEqual([])
    expect(problems[0]).toMatch(/^Filter:/)
  })

  it('drops selected ids that are not in the data', () => {
    const { state, problems } = parseViewState(`?sel=${encodeSelection([id(5), id(99_999)])}`, exists)
    expect([...state.selection]).toEqual([id(5)])
    expect(problems[0]).toMatch(/1 selected order does not exist/)
  })

  it('ignores parameters it does not know', () => {
    expect(parseViewState('?utm_source=mail&x=1', exists).problems).toEqual([])
  })
})

describe('selection codec', () => {
  it('uses ranges for runs', () => {
    expect(encodeSelection([id(3), id(1), id(2), id(9)])).toBe('r1-3.9')
  })

  it('uses a bitset when that is shorter', () => {
    const scattered = Array.from({ length: 5000 }, (_, i) => id(i * 7 + 1))
    const encoded = encodeSelection(scattered)
    expect(encoded[0]).toBe('b')
    expect(encoded.length).toBeLessThan(7000)
    expect(decodeSelection(encoded)).toEqual(scattered)
  })

  it('keeps "select all" short', () => {
    const all = Array.from({ length: 50_000 }, (_, i) => id(i + 1))
    expect(encodeSelection(all)).toBe('r1-50000')
  })

  it('falls back to a list for ids in another format', () => {
    expect(decodeSelection(encodeSelection(['X-1', 'X-2']))).toEqual(['X-1', 'X-2'])
  })

  it('rejects junk instead of guessing', () => {
    for (const junk of ['r', 'r5-1', 'r1..2', 'rabc', 'b!!', 'j[1,2]', 'q1', 'r1-9999999']) {
      expect(decodeSelection(junk)).toBeNull()
    }
  })
})
