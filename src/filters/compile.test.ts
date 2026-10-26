import { describe, expect, it } from 'vitest'
import { buildOrderIndex } from '../data/orderIndex'
import type { Order } from '../data/types'
import { checkCondition, compileFilter, parseNumberInput } from './compile'
import { describeCondition } from './describe'
import type { Condition, FilterGroup, Operator } from './model'

const base: Order = {
  id: 'ORD-0000001',
  schemaVersion: 2,
  customer: 'Priya Gupta',
  email: 'priya@example.com',
  status: 'shipped',
  amount: 5000,
  currency: 'INR',
  createdAt: Date.UTC(2025, 2, 14, 9, 30),
  updatedAt: null,
  region: 'NORTH',
  channel: 'web',
  priority: 1,
  paymentMethod: 'upi',
  itemCount: 2,
  notes: '<b>URGENT</b> call first',
}

const orders: Order[] = [
  base,
  {
    ...base,
    id: 'ORD-0000002',
    customer: 'Amit Shah',
    status: 'delivered',
    amount: 120.5,
    priority: null,
    notes: 'Repeat customer.',
  },
  {
    ...base,
    id: 'ORD-0000003',
    customer: 'Rohan Shah',
    status: 'pending',
    amount: 9000,
    createdAt: Date.UTC(2025, 2, 15),
    notes: '',
  },
]
const index = buildOrderIndex(orders)

let n = 0
const cond = (field: Condition['field'], operator: Operator, ...values: string[]): Condition => ({
  id: `t${n++}`,
  field,
  operator,
  values,
})
const group = (...conditions: Condition[]): FilterGroup => ({ id: `g${n++}`, conditions })

const ids = (...groups: FilterGroup[]) => {
  const { test } = compileFilter(groups, index)
  return orders.filter((_, i) => (test ? test(i) : true)).map((o) => o.id.slice(-1))
}

describe('compileFilter', () => {
  it('matches text case-insensitively', () => {
    expect(ids(group(cond('customer', 'contains', 'SHAH')))).toEqual(['2', '3'])
    expect(ids(group(cond('customer', 'notContains', 'shah')))).toEqual(['1'])
    expect(ids(group(cond('customer', 'equals', ' amit shah ')))).toEqual(['2'])
  })

  it('searches notes as plain text, markup included', () => {
    expect(ids(group(cond('notes', 'contains', '<b>urgent')))).toEqual(['1'])
  })

  it('compares numbers', () => {
    expect(ids(group(cond('amount', 'gt', '5000')))).toEqual(['3'])
    expect(ids(group(cond('amount', 'lt', '5,000')))).toEqual(['2'])
    expect(ids(group(cond('amount', 'eq', '120.50')))).toEqual(['2'])
    expect(ids(group(cond('amount', 'between', '120.5', '5000')))).toEqual(['1', '2'])
  })

  it('treats dates as whole UTC days', () => {
    expect(ids(group(cond('createdAt', 'before', '2025-03-15')))).toEqual(['1', '2'])
    expect(ids(group(cond('createdAt', 'after', '2025-03-14')))).toEqual(['3'])
    expect(ids(group(cond('createdAt', 'between', '2025-03-14', '2025-03-14')))).toEqual(['1', '2'])
  })

  it('never matches a missing date', () => {
    expect(ids(group(cond('updatedAt', 'before', '2100-01-01')))).toEqual([])
  })

  it('lets priority filter on None', () => {
    expect(ids(group(cond('priority', 'in', 'none')))).toEqual(['2'])
    expect(ids(group(cond('priority', 'notIn', 'none')))).toEqual(['1', '3'])
  })

  it('ORs conditions inside a group and ANDs groups', () => {
    const shippedOrDelivered = group(cond('status', 'in', 'shipped'), cond('status', 'in', 'delivered'))
    expect(ids(shippedOrDelivered)).toEqual(['1', '2'])
    expect(ids(shippedOrDelivered, group(cond('amount', 'gt', '1000')))).toEqual(['1'])
  })

  it('ignores conditions that are not finished yet', () => {
    const result = compileFilter([group(cond('customer', 'contains', '  ')), group(cond('amount', 'gt', 'abc'))], index)
    expect(result.test).toBeNull()
    expect(result.activeCount).toBe(0)
    expect(ids(group(cond('customer', 'contains', ''), cond('status', 'in', 'pending')))).toEqual(['3'])
  })

  it('can match nothing', () => {
    expect(ids(group(cond('amount', 'gt', '1000000')))).toEqual([])
  })
})

describe('checkCondition', () => {
  it('reports what is missing or wrong', () => {
    expect(checkCondition(cond('amount', 'gt', '')).kind).toBe('incomplete')
    expect(checkCondition(cond('amount', 'gt', '12abc')).kind).toBe('invalid')
    expect(checkCondition(cond('amount', 'between', '10', '')).kind).toBe('incomplete')
    expect(checkCondition(cond('amount', 'between', '10', '5')).kind).toBe('invalid')
    expect(checkCondition(cond('createdAt', 'before', '2025-02-30')).kind).toBe('invalid')
    expect(checkCondition(cond('status', 'in')).kind).toBe('incomplete')
    expect(checkCondition(cond('status', 'in', 'shipped')).kind).toBe('active')
  })
})

describe('parseNumberInput', () => {
  it('accepts the ways people type amounts', () => {
    expect(parseNumberInput('5,000')).toBe(5000)
    expect(parseNumberInput(' ₹1,23,456.50 ')).toBe(123456.5)
    expect(parseNumberInput('.5')).toBe(0.5)
    expect(parseNumberInput('-3')).toBe(-3)
  })

  it('rejects anything else', () => {
    expect(parseNumberInput('')).toBeNull()
    expect(parseNumberInput('1e3')).toBeNull()
    expect(parseNumberInput('12.')).toBeNull()
    expect(parseNumberInput('abc')).toBeNull()
  })
})

describe('describeCondition', () => {
  it('reads like a sentence', () => {
    expect(describeCondition(cond('status', 'in', 'shipped', 'delivered'))).toBe('Status is Shipped or Delivered')
    expect(describeCondition(cond('status', 'notIn', 'shipped'))).toBe('Status is not Shipped')
    expect(describeCondition(cond('amount', 'gt', '5000'))).toBe('Amount > ₹5,000')
    expect(describeCondition(cond('createdAt', 'between', '2025-03-01', '2025-03-14'))).toBe(
      'Created 01 Mar 2025 – 14 Mar 2025',
    )
    expect(describeCondition(cond('customer', 'contains', 'shah'))).toBe('Customer contains “shah”')
    expect(describeCondition(cond('priority', 'in', 'none'))).toBe('Priority is None')
  })
})
