import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Run, Source, State } from '../library'
import { fakeBackend } from '../testing'
import { App } from './app.component.tsx'

const run = (parts: Partial<Run> = {}): Run => ({
  phase: 'loading', started: false, paused: false, sources: 1, songs: 0, done: 0, failed: 0, active: 0, speed: 0, ...parts,
})
const source: Source = { id: 'p0', url: 'https://x/p0', title: 'Road trip', status: 'listed', error: '', songs: 3, done: 0, failed: 0 }
const state = (): State => ({ revision: 3, sources: [source], songs: [], run: run() })

const settle = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
})

async function shown (prepare: (backend: ReturnType<typeof fakeBackend>) => void = () => undefined) {
  const backend = fakeBackend()
  backend.answers.state = state()
  prepare(backend)
  render(<App backend={backend} />)
  await settle()

  return backend
}

afterEach(cleanup)

describe('App', () => {
  it('shows the sources of the state the Go side holds', async () => {
    await shown()
    expect(screen.getByText('Road trip')).toBeTruthy()
  })

  it('follows a batch that renames a source', async () => {
    const backend = await shown()
    act(() => {
      backend.sendBatch({
        from:    3,
        to:      4,
        sources: { upserts: [{ ...source, title: 'Summer' }], removed: [] },
        songs:   { upserts: [], removed: [] },
        run:     null,
      })
    })
    expect(screen.getByText('Summer')).toBeTruthy()
  })

  it('opens the add window from the button and from the menu', async () => {
    const backend = await shown()
    fireEvent.click(screen.getByText('Add music'))
    expect(await screen.findByText('Add')).toBeTruthy()
    cleanup()
    const other = await shown()
    act(() => {
      other.sendMenu('preferences')
    })
    expect(await screen.findByText('Save')).toBeTruthy()
    expect(backend.calls).not.toContain('getPreferences()')
  })

  it('asks the person before the window closes while downloads run', async () => {
    const backend = await shown()
    act(() => {
      backend.sendCloseRequest()
    })
    expect(await screen.findByText(/Downloads are running/)).toBeTruthy()
  })

  it('offers the list the last run left, and opens it on Continue', async () => {
    const backend = await shown(fake => {
      fake.answers.recovery = { path: String.raw`C:\x\unsaved.tmp`, sources: 2, songs: 9 }
    })
    fireEvent.click(await screen.findByText('Continue'))
    await settle()
    expect(backend.calls).toContain(String.raw`openListPath(C:\x\unsaved.tmp)`)
  })

  it('starts from the keyboard', async () => {
    const backend = await shown()
    fireEvent.keyDown(globalThis as unknown as Element, { key: 'Enter', ctrlKey: true })
    await settle()
    expect(backend.calls).toContain('start()')
  })

  it('keeps the shortcuts for a window while it is open', async () => {
    const backend = await shown()
    act(() => {
      backend.sendMenu('add')
    })
    await screen.findByText('Add')
    fireEvent.keyDown(globalThis as unknown as Element, { key: 'Enter', ctrlKey: true })
    await settle()
    expect(backend.calls).not.toContain('start()')
  })

  it('opens the list the app was started with instead of offering the recovery', async () => {
    const backend = await shown(fake => {
      fake.answers.startupList = String.raw`C:\lists\mine.mvd`
      fake.answers.recovery = { path: 'x', sources: 1, songs: 1 }
    })
    expect(backend.calls).toContain(String.raw`openListPath(C:\lists\mine.mvd)`)
    expect(screen.queryByText('Continue')).toBeNull()
  })

  it('opens a list the system hands over while the app runs', async () => {
    const backend = await shown()
    act(() => {
      backend.sendOpenFile('D:/more.mvd')
    })
    await settle()
    expect(backend.calls).toContain('openListPath(D:/more.mvd)')
  })
})
