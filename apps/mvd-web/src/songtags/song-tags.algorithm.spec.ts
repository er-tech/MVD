import { describe, expect, it } from 'vitest'
import { progressOf, qualityOf, versionLook } from './song-tags.algorithm.ts'

describe('progressOf', () => {
  it('says how far a song is from its status', () => {
    expect(progressOf({ status: 'waiting', percent: 0 })).toBe('waiting')
    expect(progressOf({ status: 'downloading', percent: 40 })).toBe('downloading')
    expect(progressOf({ status: 'official', percent: 100 })).toBe('saved')
    expect(progressOf({ status: 'failed', percent: 0 })).toBe('failed')
    expect(progressOf({ status: 'Video unavailable', percent: 0 })).toBe('skipped')
  })
})

describe('versionLook and qualityOf', () => {
  it('names the versions, and none while it is not known', () => {
    expect(versionLook('better')?.label).toBe('Best quality')
    expect(versionLook('')).toBeUndefined()
  })

  it('joins the picture and the audio', () => {
    expect(qualityOf({ height: 1080, audioKbps: 256 })).toBe('1080p · 256 kbps')
    expect(qualityOf({ height: 0, audioKbps: 0 })).toBe('')
  })
})
