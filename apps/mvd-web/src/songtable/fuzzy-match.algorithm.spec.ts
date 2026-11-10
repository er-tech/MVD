import { describe, expect, it } from 'vitest'
import type { Song } from '../library'
import { songMatches } from './fuzzy-match.algorithm.ts'

const song: Song = {
  id:        'a',
  sourceId:  'p',
  position:  1,
  artist:    'Double You',
  title:     'Part Time Lover',
  status:    'done',
  tone:      'success',
  percent:   100,
  speed:     0,
  version:   'official',
  height:    0,
  audioKbps: 0,
  audio:     '',
  error:     '',
}

describe('songMatches', () => {
  it('matches letters in order, in any case, across the artist and the title', () => {
    expect(songMatches(song, 'dbl ptl')).toBe(true)
    expect(songMatches(song, 'PART TIME')).toBe(true)
    expect(songMatches(song, 'official')).toBe(true)
  })

  it('does not match what is not there, and matches everything for an empty search', () => {
    expect(songMatches(song, 'zzz')).toBe(false)
    expect(songMatches(song, '  ')).toBe(true)
  })
})
