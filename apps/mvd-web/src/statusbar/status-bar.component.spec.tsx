import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Tools } from '../backend'
import type { Run } from '../library'
import { StatusBar } from './status-bar.component.tsx'

const run: Run = { phase: 'downloading', started: true, paused: false, sources: 1, songs: 4, done: 1, failed: 0, active: 2, speed: 2_500_000 }
const ready: Tools = { ready: true, message: '', failed: false }

function shown (parts: { tools?: Tools, notice?: string } = {}) {
  const onDismiss = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <StatusBar run={run} tools={parts.tools ?? ready} notice={parts.notice ?? ''} onDismiss={onDismiss} />
    </ChakraProvider>,
  )

  return onDismiss
}

afterEach(cleanup)

describe('StatusBar', () => {
  it('says what the run is doing and how fast', () => {
    shown()
    expect(screen.getByText('Downloading: 1 of 4 songs saved, 2 in progress.')).toBeTruthy()
    expect(screen.getByText('2.5 MB/s')).toBeTruthy()
  })

  it('says what the tools are doing instead of the run until they are ready', () => {
    shown({ tools: { ready: false, message: 'Getting the download tools (one time)…', failed: false } })
    expect(screen.getByText('Getting the download tools (one time)…')).toBeTruthy()
    expect(screen.queryByText(/Downloading/)).toBeNull()
  })

  it('shows a message from Go and lets the person close it', () => {
    const onDismiss = shown({ notice: 'add a playlist or a song first' })
    expect(screen.getByText('add a playlist or a song first')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
