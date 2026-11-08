import { describe, expect, it } from 'vitest'
import type { Run } from '../library'
import { runText, speedText } from './run-text.mapper.ts'

const run = (parts: Partial<Run>): Run => ({
  phase: 'empty', started: false, paused: false, sources: 1, songs: 5, done: 2, failed: 0, active: 1, speed: 0, ...parts,
})

describe('speedText', () => {
  it('says nothing when nothing downloads', () => {
    expect(speedText(0)).toBe('')
  })

  it('uses KB/s below a megabyte and MB/s above', () => {
    expect(speedText(512_000)).toBe('512 KB/s')
    expect(speedText(3_400_000)).toBe('3.4 MB/s')
  })

  it('never says 0 KB/s for a slow download', () => {
    expect(speedText(100)).toBe('1 KB/s')
  })
})

describe('runText', () => {
  it('tells what to do on an empty list', () => {
    expect(runText(run({ phase: 'empty' }))).toContain('Add a playlist')
  })

  it('tells that Start can be pressed while the songs load', () => {
    expect(runText(run({ phase: 'loading' }))).toContain('Press Start')
  })

  it('tells that loading and downloading go on together after Start', () => {
    expect(runText(run({ phase: 'loading', started: true }))).toBe('Loading and downloading: 2 of 5 songs saved.')
  })

  it('counts a single song in the singular', () => {
    expect(runText(run({ phase: 'ready', songs: 1 }))).toBe('1 song ready. Press Start to download.')
  })

  it('tells when the downloads are held', () => {
    expect(runText(run({ phase: 'downloading', started: true, paused: true }))).toBe('Paused: 2 of 5 songs saved.')
  })

  it('tells how a finished run ended', () => {
    expect(runText(run({ phase: 'finished', failed: 1 }))).toBe('Finished: 2 of 5 songs saved, 1 failed.')
    expect(runText(run({ phase: 'finished' }))).toBe('Finished: 2 of 5 songs saved.')
  })
})
