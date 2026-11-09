import { describe, expect, it, vi } from 'vitest'
import type { Batch, Run, Song, Source, State } from './library.contract.ts'
import { LibraryStore } from './library.store.ts'

const run = (phase: Run['phase'] = 'loading'): Run => ({
  phase, started: false, paused: false, sources: 1, songs: 2, done: 0, failed: 0, active: 0, speed: 0,
})
const source = (id: string, title = id): Source => ({ id, url: `https://x/${id}`, title, status: 'listed', error: '', position: 1, songs: 2, done: 0, failed: 0, finding: 0 })
const song = (id: string, percent = 0): Song => ({
  id,
  sourceId:  'p0',
  position:  1,
  artist:    'A',
  title:     id,
  status:    'waiting',
  tone:      'dim',
  percent,
  speed:     0,
  version:   '',
  height:    0,
  audioKbps: 0,
  error:     '',
})
const state = (): State => ({ revision: 10, sources: [source('p0')], songs: [song('e0'), song('e1')], run: run() })
const batch = (from: number, to: number, parts: Partial<Batch> = {}): Batch => ({
  from, to, sources: { upserts: [], removed: [] }, songs: { upserts: [], removed: [] }, run: null, ...parts,
})

function loaded (): LibraryStore {
  const store = new LibraryStore()
  store.replace(state())

  return store
}

describe('LibraryStore', () => {
  it('holds what it was given and the revision', () => {
    const store = loaded()
    expect(store.revision).toBe(10)
    expect(store.sources.getOrder()).toEqual(['p0'])
    expect(store.songs.getOrder()).toEqual(['e0', 'e1'])
    expect(store.getRun().phase).toBe('loading')
  })

  it('applies a batch that follows and moves the revision', () => {
    const store = loaded()
    const result = store.apply(batch(10, 11, { songs: { upserts: [song('e0', 40)], removed: [] } }))
    expect(result).toBe('applied')
    expect(store.revision).toBe(11)
    expect(store.songs.getRow('e0')?.percent).toBe(40)
  })

  it('tells only the listener of the song that changed', () => {
    const store = loaded()
    const e0 = vi.fn()
    const e1 = vi.fn()
    store.songs.subscribeRow('e0', e0)
    store.songs.subscribeRow('e1', e1)
    store.apply(batch(10, 11, { songs: { upserts: [song('e0', 5)], removed: [] } }))
    expect(e0).toHaveBeenCalledTimes(1)
    expect(e1).not.toHaveBeenCalled()
  })

  it('changes the run only when the batch has one, and tells its listeners', () => {
    const store = loaded()
    const listener = vi.fn()
    store.subscribeRun(listener)
    store.apply(batch(10, 11))
    expect(listener).not.toHaveBeenCalled()
    store.apply(batch(11, 12, { run: run('ready') }))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getRun().phase).toBe('ready')
  })

  it('keeps the run object when a batch brings the same run', () => {
    const store = loaded()
    const held = store.getRun()
    const listener = vi.fn()
    store.subscribeRun(listener)
    store.apply(batch(10, 11, { run: run() }))
    expect(store.getRun()).toBe(held)
    expect(listener).not.toHaveBeenCalled()
  })

  it('removes a source and its songs when the batch says so', () => {
    const store = loaded()
    store.apply(batch(10, 11, { sources: { upserts: [], removed: ['p0'] }, songs: { upserts: [], removed: ['e0', 'e1'] } }))
    expect(store.sources.getOrder()).toEqual([])
    expect(store.songs.getOrder()).toEqual([])
  })

  it('ignores a batch it already has', () => {
    const store = loaded()
    const result = store.apply(batch(5, 10, { songs: { upserts: [song('e0', 9)], removed: [] } }))
    expect(result).toBe('stale')
    expect(store.songs.getRow('e0')?.percent).toBe(0)
  })

  it('reports a gap when a batch was missed, and changes nothing', () => {
    const store = loaded()
    const result = store.apply(batch(11, 12, { songs: { upserts: [song('e0', 9)], removed: [] } }))
    expect(result).toBe('gap')
    expect(store.revision).toBe(10)
    expect(store.songs.getRow('e0')?.percent).toBe(0)
  })

  it('shows the same list for the same state, however many times it is loaded', () => {
    const first = new LibraryStore()
    first.replace(state())
    const shown = JSON.stringify([first.sources.getOrder(), first.songs.getOrder()])
    for (let load = 0; load < 10; load++) {
      const store = new LibraryStore()
      store.replace(state())
      expect(JSON.stringify([store.sources.getOrder(), store.songs.getOrder()])).toBe(shown)
    }
  })
})
