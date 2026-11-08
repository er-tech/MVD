import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { takeRowDraws } from '../metrics'
import { RowsStore } from '../rowstore'
import type { Row } from '../rowstore'
import { SongRow } from './song-row.component.tsx'

const row = (id: string, percent = 0): Row => ({ id, artist: `Artist ${id}`, title: `Title ${id}`, status: 'waiting', percent })

function twoRows () {
  const store = new RowsStore()
  store.replace({ revision: 1, rows: [row('a'), row('b')] })
  render(
    <ChakraProvider value={defaultSystem}>
      {['a', 'b'].map(id => (
        <SongRow key={id} id={id} store={store} top={0} height={32} selected={false} onSelect={() => undefined} />
      ))}
    </ChakraProvider>,
  )
  takeRowDraws()

  return store
}

afterEach(cleanup)

describe('SongRow', () => {
  it('shows the artist and the title of its row', () => {
    twoRows()
    expect(screen.getByText('Title a')).toBeTruthy()
    expect(screen.getByText('Title b')).toBeTruthy()
  })

  it('draws only the row that changed', () => {
    const store = twoRows()
    act(() => {
      store.apply({ from: 1, to: 2, upserts: [row('a', 50)], removed: [] })
    })
    expect(takeRowDraws()).toBe(1)
  })

  it('draws nothing when a batch changes a row that is not on screen', () => {
    const store = twoRows()
    act(() => {
      store.apply({ from: 1, to: 2, upserts: [row('far-away', 50)], removed: [] })
    })
    expect(takeRowDraws()).toBe(0)
  })

  it('draws nothing for a state equal to the one shown', () => {
    const store = twoRows()
    const a = store.getRow('a')!
    const b = store.getRow('b')!
    act(() => {
      store.replace({ revision: 5, rows: [a, b] })
    })
    expect(takeRowDraws()).toBe(0)
  })
})
