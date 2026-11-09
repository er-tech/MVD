import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Table } from '../library'
import type { Song, Source } from '../library'
import { SongTable } from './song-table.component.tsx'

afterEach(cleanup)

const song = (id: string, artist: string, title: string): Song => ({
  id, sourceId: 'p0', position: 1, artist, title, status: 'waiting', tone: 'dim', percent: 0, speed: 0, version: '', height: 0, audioKbps: 0, error: '',
})

function shown (selected?: string) {
  const songs = new Table<Song>()
  songs.replace([song('a', 'Zed', 'Alpha'), song('b', 'Amy', 'Beta'), song('c', 'Bob', 'Gamma')])
  const onSelect = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <SongTable songs={songs} sources={new Table<Source>()} selected={selected} onSelect={onSelect} entriesFor={() => Promise.resolve([])} />
    </ChakraProvider>,
  )

  return { onSelect }
}

const rowCount = () => screen.getByRole('table').getAttribute('aria-rowcount')

describe('SongTable', () => {
  it('shows only the songs that match the search, in a fuzzy way', () => {
    shown()
    expect(rowCount()).toBe('3')
    fireEvent.change(screen.getByLabelText('Search the songs'), { target: { value: 'amy' } })
    expect(rowCount()).toBe('1')
    fireEvent.change(screen.getByLabelText('Search the songs'), { target: { value: 'zzzz' } })
    expect(screen.getByText('No song matches the search.')).toBeTruthy()
  })

  it('sorts by a column when its header is pressed, and back', () => {
    shown()
    const artist = screen.getByRole('columnheader', { name: /artist/i })
    expect(artist.getAttribute('aria-sort')).toBe('none')
    fireEvent.click(artist)
    expect(artist.getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(artist)
    expect(artist.getAttribute('aria-sort')).toBe('descending')
  })

  it('has a handle to resize each column', () => {
    shown()
    expect(screen.getAllByRole('separator')).toHaveLength(7)
  })

  it('moves the choice down and up with the arrows, in the order shown', () => {
    const { onSelect } = shown('a')
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenLastCalledWith('b')
    fireEvent.keyDown(document.body, { key: 'ArrowUp' })
    expect(onSelect).toHaveBeenLastCalledWith('a')
  })

  it('starts at the first song when none is chosen, and follows the sort', () => {
    const { onSelect } = shown()
    fireEvent.click(screen.getByRole('columnheader', { name: /artist/i }))
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenLastCalledWith('b')
  })

  it('leaves the arrows to a field', () => {
    const { onSelect } = shown('a')
    fireEvent.keyDown(screen.getByLabelText('Search the songs'), { key: 'ArrowDown' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
