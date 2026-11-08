import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Detail } from '../backend'
import { LibraryStore } from '../library'
import type { Song } from '../library'
import { fakeBackend } from '../testing'
import { DetailsPanel } from './details-panel.component.tsx'

const song = (percent = 0): Song => ({
  id:        'e0',
  sourceId:  'p0',
  position:  1,
  artist:    'A',
  title:     'Song',
  status:    'waiting',
  tone:      'dim',
  percent,
  speed:     0,
  version:   '',
  height:    0,
  audioKbps: 0,
  error:     '',
})
const detail: Detail = {
  kind:   'song',
  id:     'e0',
  title:  'Song',
  log:    ['found it'],
  fields: [{ label: 'Artist', value: 'The Band' }, { label: 'Status', value: 'official found' }],
  links:  [
    { label: 'Video in the playlist', url: 'https://www.youtube.com/watch?v=a' },
    { label: 'Official video found', url: 'https://www.youtube.com/watch?v=b' },
  ],
}

function shown (selection?: { kind: 'song' | 'source', id: string }) {
  const backend = fakeBackend()
  backend.answers.detail = detail
  const store = new LibraryStore()
  store.songs.replace([song()])
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <DetailsPanel backend={backend} store={store} selection={selection} />
    </ChakraProvider>,
  )

  return { backend, store, view }
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('DetailsPanel', () => {
  it('asks the person to choose when nothing is selected, and asks Go for nothing', () => {
    const { backend } = shown()
    expect(screen.getByTestId('details-empty')).toBeTruthy()
    expect(backend.calls).toEqual([])
  })

  it('shows all the details and the links of the selected song', async () => {
    const { backend } = shown({ kind: 'song', id: 'e0' })
    await settle()
    expect(backend.calls).toEqual(['getDetail(song, e0)'])
    expect(screen.getByText('The Band')).toBeTruthy()
    expect(screen.getByText('official found')).toBeTruthy()
    expect(screen.getByText('found it')).toBeTruthy()
    expect(screen.getByText('Video in the playlist')).toBeTruthy()
    expect(screen.getByText('Official video found')).toBeTruthy()
  })

  it('opens a link through the backend', async () => {
    const { backend } = shown({ kind: 'song', id: 'e0' })
    await settle()
    fireEvent.click(screen.getByText('Official video found'))
    expect(backend.calls).toContain('openLink(https://www.youtube.com/watch?v=b)')
  })

  it('asks again, at most every 300 ms, while the selected song changes', async () => {
    const { backend, store } = shown({ kind: 'song', id: 'e0' })
    await settle()
    for (let percent = 1; percent <= 50; percent++) {
      act(() => {
        store.songs.apply({ upserts: [song(percent)], removed: [] })
      })
    }
    expect(backend.calls).toHaveLength(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
    expect(backend.calls).toHaveLength(2)
  })

  it('does not ask again for a change to another song', async () => {
    const { backend, store } = shown({ kind: 'song', id: 'e0' })
    await settle()
    act(() => {
      store.songs.apply({ upserts: [{ ...song(), id: 'e1' }], removed: [] })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(backend.calls).toHaveLength(1)
  })

  it('shows the message when the item is gone', async () => {
    const backend = fakeBackend()
    backend.failNext.set('getDetail', 'that item is not in the list')
    render(
      <ChakraProvider value={defaultSystem}>
        <DetailsPanel backend={backend} store={new LibraryStore()} selection={{ kind: 'song', id: 'e9' }} />
      </ChakraProvider>,
    )
    await settle()
    expect(screen.getByText('that item is not in the list')).toBeTruthy()
  })
})
