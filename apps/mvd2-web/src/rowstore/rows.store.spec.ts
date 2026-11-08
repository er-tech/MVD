import { describe, expect, it, vi } from 'vitest'
import type { Row } from './row.contract.ts'
import { RowsStore } from './rows.store.ts'

const row = (id: string, percent = 0): Row => ({ id, artist: 'A', title: id, status: 'waiting', percent })

function loaded (): RowsStore {
  const store = new RowsStore()
  store.replace({ revision: 10, rows: [row('a'), row('b'), row('c')] })

  return store
}

describe('RowsStore', () => {
  it('tells only the listeners of a changed row, and keeps the list of IDs', () => {
    const store = loaded()
    const a = vi.fn()
    const b = vi.fn()
    const list = vi.fn()
    store.subscribeRow('a', a)
    store.subscribeRow('b', b)
    store.subscribeList(list)
    const order = store.getOrder()

    expect(store.apply({ from: 10, to: 11, upserts: [row('a', 5)], removed: [] })).toBe('applied')

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    expect(store.getOrder()).toBe(order)
    expect(store.getRow('a')?.percent).toBe(5)
  })

  it('keeps the same row object for a row that did not change', () => {
    const store = loaded()
    const b = store.getRow('b')
    store.apply({ from: 10, to: 11, upserts: [row('a', 1)], removed: [] })
    expect(store.getRow('b')).toBe(b)
  })

  it('adds and removes rows and tells the list', () => {
    const store = loaded()
    const list = vi.fn()
    store.subscribeList(list)
    store.apply({ from: 10, to: 12, upserts: [row('d')], removed: ['a'] })
    expect(store.getOrder()).toEqual(['b', 'c', 'd'])
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('ignores a batch it already has', () => {
    const store = loaded()
    expect(store.apply({ from: 5, to: 10, upserts: [row('a', 9)], removed: [] })).toBe('stale')
    expect(store.getRow('a')?.percent).toBe(0)
  })

  it('reports a gap when a batch was missed, and changes nothing', () => {
    const store = loaded()
    expect(store.apply({ from: 11, to: 12, upserts: [row('a', 9)], removed: [] })).toBe('gap')
    expect(store.revision).toBe(10)
    expect(store.getRow('a')?.percent).toBe(0)
  })

  it('applies a batch that overlaps the state it started from', () => {
    const store = loaded()
    expect(store.apply({ from: 8, to: 11, upserts: [row('a', 3)], removed: [] })).toBe('applied')
    expect(store.revision).toBe(11)
  })

  it('tells the rows that differ when everything is replaced', () => {
    const store = loaded()
    const a = vi.fn()
    const b = vi.fn()
    store.subscribeRow('a', a)
    store.subscribeRow('b', b)
    const sameB = store.getRow('b')
    store.replace({ revision: 20, rows: [row('a', 7), sameB!] })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    expect(store.getOrder()).toEqual(['a', 'b'])
  })

  it('stops telling a listener that unsubscribed', () => {
    const store = loaded()
    const a = vi.fn()
    store.subscribeRow('a', a)()
    store.apply({ from: 10, to: 11, upserts: [row('a', 1)], removed: [] })
    expect(a).not.toHaveBeenCalled()
  })
})
