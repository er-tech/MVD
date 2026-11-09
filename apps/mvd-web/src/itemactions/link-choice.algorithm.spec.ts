import { describe, expect, it } from 'vitest'
import { isAddress, linkOf } from './link-choice.algorithm.ts'

const original = { label: 'Video in the playlist', url: 'https://www.youtube.com/watch?v=o' }
const official = { label: 'Official video found', url: 'https://www.youtube.com/watch?v=f' }

describe('linkOf', () => {
  it('finds the link of each kind of video', () => {
    const audio = { label: 'Best audio found', url: 'u' }
    expect(linkOf([original, official, audio], 'official')).toBe(official)
    expect(linkOf([original, official, audio], 'original')).toBe(original)
    expect(linkOf([original, official, audio], 'best-audio')).toBe(audio)
    expect(linkOf([original], 'official')).toBeUndefined()
  })

  it('counts the official video that is the one in the playlist as the original too', () => {
    const both = { label: 'Official video (the one in the playlist)', url: 'b' }
    expect(linkOf([both], 'official')).toBe(both)
    expect(linkOf([both], 'original')).toBe(both)
  })
})

describe('isAddress', () => {
  it('accepts web addresses only', () => {
    expect(isAddress('https://youtu.be/a')).toBe(true)
    expect(isAddress('Artist, Album')).toBe(false)
    expect(isAddress('ftp://x.y')).toBe(false)
  })
})
