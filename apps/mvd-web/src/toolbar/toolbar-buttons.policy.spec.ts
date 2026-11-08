import { describe, expect, it } from 'vitest'
import type { Run } from '../library'
import { toolbarButtons } from './toolbar-buttons.policy.ts'

const run = (parts: Partial<Run> = {}): Run => ({
  phase: 'empty', started: false, paused: false, sources: 0, songs: 0, done: 0, failed: 0, active: 0, speed: 0, ...parts,
})

describe('toolbarButtons', () => {
  it('lets the person add music and nothing else on an empty list', () => {
    expect(toolbarButtons(run(), true)).toEqual({ add: true, start: false, pause: false, resume: false, retry: false })
  })

  it('lets the person start while the songs are still loading', () => {
    expect(toolbarButtons(run({ phase: 'loading', sources: 1 }), true).start).toBe(true)
  })

  it('lets the person start a list that is loaded', () => {
    expect(toolbarButtons(run({ phase: 'ready', sources: 1, songs: 5 }), true).start).toBe(true)
  })

  it('does not offer Start again once the downloads began', () => {
    expect(toolbarButtons(run({ phase: 'downloading', started: true, sources: 1 }), true).start).toBe(false)
  })

  it('offers Pause while downloading and Resume when paused', () => {
    const going = toolbarButtons(run({ phase: 'downloading', started: true, sources: 1 }), true)
    expect([going.pause, going.resume]).toEqual([true, false])
    const held = toolbarButtons(run({ phase: 'downloading', started: true, paused: true, sources: 1 }), true)
    expect([held.pause, held.resume]).toEqual([false, true])
  })

  it('offers Retry only when a song failed', () => {
    expect(toolbarButtons(run({ failed: 2 }), true).retry).toBe(true)
    expect(toolbarButtons(run({ failed: 0 }), true).retry).toBe(false)
  })

  it('offers neither Add nor Start before the download tools are ready', () => {
    const buttons = toolbarButtons(run({ phase: 'ready', sources: 1 }), false)
    expect([buttons.add, buttons.start]).toEqual([false, false])
  })
})
