import { describe, expect, it } from 'vitest'
import { videoIdOf } from './video-id.algorithm.ts'

describe('videoIdOf', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=4',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ])('reads %s', address => {
    expect(videoIdOf(address)).toBe('dQw4w9WgXcQ')
  })

  it.each([
    'https://www.youtube.com/playlist?list=PL1',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'not an address',
  ])('says nothing for %s', address => {
    expect(videoIdOf(address)).toBeUndefined()
  })
})
