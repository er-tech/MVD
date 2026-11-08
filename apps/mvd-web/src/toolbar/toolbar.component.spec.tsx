import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Run } from '../library'
import { fakeBackend } from '../testing'
import { Toolbar } from './toolbar.component.tsx'

const run = (parts: Partial<Run> = {}): Run => ({
  phase: 'ready', started: false, paused: false, sources: 1, songs: 3, done: 0, failed: 0, active: 0, speed: 0, ...parts,
})

function shown (state: Run, toolsReady = true) {
  const backend = fakeBackend()
  const onAdd = vi.fn()
  const onError = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <Toolbar backend={backend} run={state} toolsReady={toolsReady} onAdd={onAdd} onError={onError} />
    </ChakraProvider>,
  )

  return { backend, onAdd, onError }
}

const settle = () => act(async () => {
  await Promise.resolve()
})

afterEach(cleanup)

describe('Toolbar', () => {
  it('asks the page to open the add window', () => {
    const { onAdd } = shown(run())
    fireEvent.click(screen.getByText('Add music'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('starts the downloads through the backend', async () => {
    const { backend } = shown(run())
    fireEvent.click(screen.getByText('Start'))
    await settle()
    expect(backend.calls).toEqual(['start()'])
  })

  it('shows what Go refused', async () => {
    const { backend, onError } = shown(run())
    backend.failNext.set('start', 'Getting the download tools')
    fireEvent.click(screen.getByText('Start'))
    await settle()
    expect(onError).toHaveBeenCalledWith('Getting the download tools')
  })

  it('swaps Pause for Resume when the downloads are held', async () => {
    const { backend } = shown(run({ phase: 'downloading', started: true, paused: true }))
    expect(screen.queryByText('Pause')).toBeNull()
    fireEvent.click(screen.getByText('Resume'))
    await settle()
    expect(backend.calls).toEqual(['resume()'])
  })

  it('disables what cannot be done', () => {
    shown(run({ phase: 'empty', sources: 0, songs: 0 }), false)
    for (const name of ['Add music', 'Start', 'Retry failed']) {
      expect(screen.getByRole('button', { name })).toHaveProperty('disabled', true)
    }
  })
})
