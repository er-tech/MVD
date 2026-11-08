import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { RecoveryModal } from './recovery-modal.component.tsx'

afterEach(cleanup)

const path = String.raw`C:\last.mvd`

function open () {
  const backend = fakeBackend()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <RecoveryModal info={{ path, sources: 2, songs: 30 }} backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )

  return { backend, onClose }
}

describe('RecoveryModal', () => {
  it('shows the counts of the list', () => {
    open()
    expect(screen.getByText(/2 links and 30 songs/)).toBeTruthy()
  })

  it('opens the list on Continue and closes', async () => {
    const { backend, onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(backend.calls).toEqual([`openListPath(${path})`])
  })

  it('shows the refusal on Continue and stays open', async () => {
    const { backend, onClose } = open()
    backend.failNext.set('openListPath', 'The file is gone')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('The file is gone')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('discards the list on Start fresh and closes', async () => {
    const { backend, onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(backend.calls).toEqual(['discardRecovery()'])
  })
})
