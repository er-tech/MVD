import { describe, expect, it } from 'vitest'
import { Table } from '../library'
import type { Song } from '../library'
import { visibleIds } from './visible-ids.algorithm.ts'

const song = (id: string, sourceId: string): Song => ({
  id,
  sourceId,
  position:  1,
  artist:    '',
  title:     id,
  status:    '',
  tone:      'text',
  percent:   0,
  speed:     0,
  version:   '',
  height:    0,
  audioKbps: 0,
  audio:     '',
  error:     '',
})

function table () {
  const songs = new Table<Song>()
  songs.replace([song('a', 'p0'), song('b', 'p1'), song('c', 'p0')])

  return songs
}

describe('visibleIds', () => {
  it('gives every song, as the same array, when no source is chosen', () => {
    const songs = table()
    expect(visibleIds(songs.getOrder(), songs, undefined)).toBe(songs.getOrder())
  })

  it('gives only the songs of the chosen source, in order', () => {
    const songs = table()
    expect(visibleIds(songs.getOrder(), songs, 'p0')).toEqual(['a', 'c'])
  })

  it('gives nothing for a source with no songs', () => {
    const songs = table()
    expect(visibleIds(songs.getOrder(), songs, 'p9')).toEqual([])
  })
})
