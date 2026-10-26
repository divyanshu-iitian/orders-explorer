import { describe, expect, it } from 'vitest'
import type { Order } from '../data/types'
import { countVisible, setRange, toggleId } from './selection'

const orders = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id }) as Order)
const rows = Int32Array.from([4, 3, 2, 1, 0]) // view sorted in reverse

describe('selection helpers', () => {
  it('toggles one id without touching the others', () => {
    const once = toggleId(new Set(['A']), 'B')
    expect([...once].sort()).toEqual(['A', 'B'])
    expect([...toggleId(once, 'A')]).toEqual(['B'])
  })

  it('selects a range in view order, whichever end was clicked first', () => {
    expect([...setRange(new Set(), orders, rows, 3, 1)].sort()).toEqual(['B', 'C', 'D'])
    expect([...setRange(new Set(), orders, rows, 1, 3)].sort()).toEqual(['B', 'C', 'D'])
  })

  it('clamps a range to the view', () => {
    expect(setRange(new Set(), orders, rows, -5, 99).size).toBe(5)
  })

  it('can clear a range', () => {
    expect([...setRange(new Set(['A', 'B', 'E']), orders, rows, 0, 1, false)]).toEqual(['A', 'B'])
  })

  it('counts only selected ids that are visible', () => {
    const positionById = new Map(orders.map((o, i) => [o.id, i]))
    const visible = Uint8Array.from([1, 0, 1, 0, 0])
    expect(countVisible(new Set(['A', 'B', 'C', 'missing']), visible, positionById)).toBe(2)
  })
})
