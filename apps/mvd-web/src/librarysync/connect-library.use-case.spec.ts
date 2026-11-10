import { describe, expect, it } from 'vitest'
import { LibraryStore } from '../library'
import type { Batch, Song, State } from '../library'
import { fakeBackend } from '../testing'
import { connectLibrary } from './connect-library.use-case.ts'

const song = (percent = 0): Song => ({
  id:        'e0',
  sourceId:  'p0',
  position:  1,
  artist:    'A',
  title:     'a',
  status:    'waiting',
  tone:      'dim',
  percent,
  speed:     0,
  version:   '',
  height:    0,
  audioKbps: 0,
  audio:     '',
  error:     '',
})
const state = (revision: number, percent = 0): State => ({
  revision,
  sources: [],
  songs:   [song(percent)],
  run:     { phase: 'loading', started: false, paused: false, sources: 1, songs: 1, done: 0, failed: 0, active: 0, speed: 0 },
})
const batch = (from: number, to: number, percent: number): Batch => ({
  from, to, sources: { upserts: [], removed: [] }, songs: { upserts: [song(percent)], removed: [] }, run: null,
})
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function connected (initial: State) {
  const backend = fakeBackend()
  backend.answers.state = initial
  const store = new LibraryStore()
  const stop = connectLibrary(backend, store)

  return { backend, store, stop }
}

describe('connectLibrary', () => {
  it('loads the state and then applies the batches that follow', async () => {
    const { backend, store } = connected(state(5))
    await flush()
    backend.sendBatch(batch(5, 6, 40))
    expect(store.songs.getRow('e0')?.percent).toBe(40)
  })

  it('keeps a batch that arrives before the state and applies it after', async () => {
    const { backend, store } = connected(state(5))
    backend.sendBatch(batch(5, 6, 10))
    expect(store.songs.getRow('e0')).toBeUndefined()
    await flush()
    expect(store.songs.getRow('e0')?.percent).toBe(10)
  })

  it('loads everything again when a batch skips a revision', async () => {
    const { backend, store } = connected(state(5))
    await flush()
    backend.answers.state = state(20, 90)
    backend.sendBatch(batch(12, 13, 50))
    await flush()
    expect(store.revision).toBe(20)
    expect(store.songs.getRow('e0')?.percent).toBe(90)
    expect(backend.calls.filter(call => call === 'getState()')).toHaveLength(2)
  })

  it('drops a batch it already has', async () => {
    const { backend, store } = connected(state(5, 7))
    await flush()
    backend.sendBatch(batch(2, 4, 99))
    expect(store.songs.getRow('e0')?.percent).toBe(7)
  })

  it('stops listening when stopped', async () => {
    const { backend, store, stop } = connected(state(5))
    await flush()
    stop()
    backend.sendBatch(batch(5, 6, 77))
    expect(store.songs.getRow('e0')?.percent).toBe(0)
  })
})
