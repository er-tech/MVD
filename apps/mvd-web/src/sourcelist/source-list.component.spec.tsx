import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Table } from '../library'
import type { Source } from '../library'
import { SourceList } from './source-list.component.tsx'

const source = (id: string, parts: Partial<Source> = {}): Source => ({
  id, url: `https://x/${id}`, title: `List ${id}`, status: 'listed', error: '', songs: 4, done: 1, failed: 0, ...parts,
})

function shown (sources: Table<Source>) {
  const onSelect = vi.fn()
  const onRemove = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <SourceList sources={sources} onSelect={onSelect} onRemove={onRemove} />
    </ChakraProvider>,
  )

  return { onSelect, onRemove }
}

afterEach(cleanup)

describe('SourceList', () => {
  it('says what to do when nothing was added', () => {
    shown(new Table<Source>())
    expect(screen.getByText(/Nothing added yet/)).toBeTruthy()
  })

  it('shows each source with how far it is', () => {
    const sources = new Table<Source>()
    sources.replace([source('p0'), source('p1', { status: 'listing', title: 'https://x/p1' })])
    shown(sources)
    expect(screen.getByText('List p0')).toBeTruthy()
    expect(screen.getByText('1 of 4 saved')).toBeTruthy()
    expect(screen.getByText('Loading…')).toBeTruthy()
  })

  it('shows why a source failed', () => {
    const sources = new Table<Source>()
    sources.replace([source('p0', { status: 'failed', error: 'This video is private' })])
    shown(sources)
    expect(screen.getByText('This video is private')).toBeTruthy()
  })

  it('selects a source on click and removes it without selecting it', () => {
    const sources = new Table<Source>()
    sources.replace([source('p0')])
    const { onSelect, onRemove } = shown(sources)
    fireEvent.click(screen.getByText('List p0'))
    expect(onSelect).toHaveBeenCalledWith('p0')
    fireEvent.click(screen.getByLabelText('Remove List p0'))
    expect(onRemove).toHaveBeenCalledWith('p0')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('shows a source that is added and its new title', () => {
    const sources = new Table<Source>()
    sources.replace([source('p0', { status: 'listing', title: 'https://x/p0' })])
    shown(sources)
    act(() => {
      sources.apply({ upserts: [source('p0', { title: 'Road trip' }), source('p1')], removed: [] })
    })
    expect(screen.getByText('Road trip')).toBeTruthy()
    expect(screen.getByText('List p1')).toBeTruthy()
  })
})
