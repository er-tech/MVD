import { describe, expect, it } from 'vitest'
import type { Backend } from '../backend'
import { RowsStore } from '../rowstore'
import type { Batch, Row, State } from '../rowstore'
import { connectRows } from './connect-rows.use-case.ts'

const rowA = (percent = 0): Row => ({ id: 'a', artist: 'A', title: 'a', status: 'waiting', percent })
const batch = (from: number, to: number, ...upserts: Row[]): Batch => ({ from, to, upserts, removed: [] })

const noListener = (): void => undefined

function fakeBackend (initial: State) {
  let listener: (batch: Batch) => void = noListener
  const calls = { getState: 0 }
  let state = initial
  const backend: Backend = {
    getState: () => {
      calls.getState++

      return Promise.resolve(state)
    },
    onRows: l => {
      listener = l

      return () => { listener = noListener }
    },
    metric: () => undefined,
  }

  return { backend, calls, send: (b: Batch) => listener(b), setState: (s: State) => { state = s } }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('connectRows', () => {
  it('loads the state and then applies the batches that follow', async () => {
    const fake = fakeBackend({ revision: 5, rows: [rowA()] })
    const store = new RowsStore()
    connectRows(fake.backend, store)
    await flush()
    fake.send(batch(5, 6, rowA(40)))
    expect(store.getRow('a')?.percent).toBe(40)
  })

  it('keeps a batch that arrives before the state and applies it after', async () => {
    const fake = fakeBackend({ revision: 5, rows: [rowA()] })
    const store = new RowsStore()
    connectRows(fake.backend, store)
    fake.send(batch(5, 6, rowA(10)))
    expect(store.getRow('a')).toBeUndefined()
    await flush()
    expect(store.getRow('a')?.percent).toBe(10)
  })

  it('loads everything again when a batch skips a revision', async () => {
    const fake = fakeBackend({ revision: 5, rows: [rowA()] })
    const store = new RowsStore()
    connectRows(fake.backend, store)
    await flush()
    fake.setState({ revision: 20, rows: [rowA(90)] })
    fake.send(batch(15, 20, rowA(90)))
    await flush()
    expect(fake.calls.getState).toBe(2)
    expect(store.getRow('a')?.percent).toBe(90)
    expect(store.revision).toBe(20)
  })

  it('does nothing after it is stopped', async () => {
    const fake = fakeBackend({ revision: 5, rows: [rowA()] })
    const store = new RowsStore()
    const stop = connectRows(fake.backend, store)
    await flush()
    stop()
    fake.send(batch(5, 6, rowA(77)))
    expect(store.getRow('a')?.percent).toBe(0)
  })
})
