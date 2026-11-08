import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Table } from '../library'
import type { Song } from '../library'
import { takeRowDraws } from '../metrics'
import { SongRow } from './song-row.component.tsx'

const song = (id: string, percent = 0): Song => ({
  id,
  sourceId:  'p0',
  position:  1,
  artist:    `Artist ${id}`,
  title:     `Title ${id}`,
  status:    'waiting',
  tone:      'dim',
  percent,
  speed:     0,
  version:   '',
  height:    0,
  audioKbps: 0,
  error:     '',
})
const upserts = (...rows: Song[]) => ({ upserts: rows, removed: [] })

function twoRows () {
  const songs = new Table<Song>()
  songs.replace([song('a'), song('b')])
  render(
    <ChakraProvider value={defaultSystem}>
      {['a', 'b'].map(id => (
        <SongRow key={id} id={id} songs={songs} top={0} height={32} selected={false} onSelect={() => undefined} />
      ))}
    </ChakraProvider>,
  )
  takeRowDraws()

  return songs
}

afterEach(cleanup)

describe('SongRow', () => {
  it('shows the artist and the title of its song', () => {
    twoRows()
    expect(screen.getByText('Title a')).toBeTruthy()
    expect(screen.getByText('Title b')).toBeTruthy()
  })

  it('draws only the row that changed', () => {
    const songs = twoRows()
    act(() => {
      songs.apply(upserts(song('a', 50)))
    })
    expect(takeRowDraws()).toBe(1)
  })

  it('draws nothing when a batch changes a song that is not on screen', () => {
    const songs = twoRows()
    act(() => {
      songs.apply(upserts(song('far-away', 50)))
    })
    expect(takeRowDraws()).toBe(0)
  })

  it('draws nothing when everything is replaced with the same values', () => {
    const songs = twoRows()
    act(() => {
      songs.replace([song('a'), song('b')])
    })
    expect(takeRowDraws()).toBe(0)
  })
})
