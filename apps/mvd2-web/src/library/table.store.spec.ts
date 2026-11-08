import { describe, expect, it, vi } from 'vitest'
import { Table } from './table.store.ts'

interface Item {
  id: string
  n:  number
}

const item = (id: string, n = 0): Item => ({ id, n })
const changes = (upserts: Item[], removed: string[] = []) => ({ upserts, removed })

function loaded (): Table<Item> {
  const table = new Table<Item>()
  table.replace([item('a'), item('b'), item('c')])

  return table
}

describe('Table', () => {
  it('tells only the listeners of a changed row, and keeps the list of IDs', () => {
    const table = loaded()
    const a = vi.fn()
    const b = vi.fn()
    const list = vi.fn()
    table.subscribeRow('a', a)
    table.subscribeRow('b', b)
    table.subscribeList(list)
    const order = table.getOrder()

    table.apply(changes([item('a', 5)]))

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    expect(table.getOrder()).toBe(order)
    expect(table.getRow('a')?.n).toBe(5)
  })

  it('keeps the same object for a row that did not change', () => {
    const table = loaded()
    const b = table.getRow('b')
    table.apply(changes([item('a', 1)]))
    expect(table.getRow('b')).toBe(b)
  })

  it('adds rows at the end, removes rows, and tells the list once', () => {
    const table = loaded()
    const list = vi.fn()
    table.subscribeList(list)
    table.apply(changes([item('d')], ['a']))
    expect(table.getOrder()).toEqual(['b', 'c', 'd'])
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('removes a row that was added in the same batch', () => {
    const table = loaded()
    table.apply(changes([item('d')], ['d']))
    expect(table.getOrder()).toEqual(['a', 'b', 'c'])
    expect(table.getRow('d')).toBeUndefined()
  })

  it('tells the listeners of a removed row', () => {
    const table = loaded()
    const a = vi.fn()
    table.subscribeRow('a', a)
    table.apply(changes([], ['a']))
    expect(a).toHaveBeenCalledTimes(1)
    expect(table.getRow('a')).toBeUndefined()
  })

  it('stops telling a listener that stopped listening', () => {
    const table = loaded()
    const a = vi.fn()
    const stop = table.subscribeRow('a', a)
    stop()
    table.apply(changes([item('a', 1)]))
    expect(a).not.toHaveBeenCalled()
  })

  it('keeps the object and the listeners quiet when everything is replaced with the same values', () => {
    const table = loaded()
    const a = table.getRow('a')
    const order = table.getOrder()
    const listener = vi.fn()
    table.subscribeRow('a', listener)
    table.subscribeList(listener)
    table.replace([item('a'), item('b'), item('c')])
    expect(table.getRow('a')).toBe(a)
    expect(table.getOrder()).toBe(order)
    expect(listener).not.toHaveBeenCalled()
  })

  it('draws only the rows that differ when everything is replaced', () => {
    const table = loaded()
    const a = vi.fn()
    const b = vi.fn()
    table.subscribeRow('a', a)
    table.subscribeRow('b', b)
    table.replace([item('a', 7), item('b'), item('c')])
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
  })

  it('tells the list when a replace changes the order', () => {
    const table = loaded()
    const list = vi.fn()
    table.subscribeList(list)
    table.replace([item('c'), item('a'), item('b')])
    expect(list).toHaveBeenCalledTimes(1)
    expect(table.getOrder()).toEqual(['c', 'a', 'b'])
  })
})
