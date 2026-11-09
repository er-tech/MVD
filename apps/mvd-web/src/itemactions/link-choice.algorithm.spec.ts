import { describe, expect, it } from 'vitest'
import { isAddress, preferredLink } from './link-choice.algorithm.ts'

const original = { label: 'Video in the playlist', url: 'https://www.youtube.com/watch?v=o' }
const official = { label: 'Official video found', url: 'https://www.youtube.com/watch?v=f' }

describe('preferredLink', () => {
  it('takes the official video when there is one, else the original', () => {
    expect(preferredLink([original, official])).toBe(official)
    expect(preferredLink([original])).toBe(original)
    expect(preferredLink([{ label: 'Best audio found', url: 'u' }])?.label).toBe('Best audio found')
    expect(preferredLink([])).toBeUndefined()
  })
})

describe('isAddress', () => {
  it('accepts web addresses only', () => {
    expect(isAddress('https://youtu.be/a')).toBe(true)
    expect(isAddress('Artist, Album')).toBe(false)
    expect(isAddress('ftp://x.y')).toBe(false)
  })
})
