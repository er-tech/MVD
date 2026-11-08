import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { QuitQuestionModal } from './quit-question-modal.component.tsx'

afterEach(cleanup)

function open () {
  const backend = fakeBackend()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <QuitQuestionModal open backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )

  return { backend, onClose }
}

describe('QuitQuestionModal', () => {
  it('quits for good on Quit', () => {
    const { backend, onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))
    expect(backend.calls).toEqual(['confirmQuit()'])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes without quitting on Keep working', () => {
    const { backend, onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Keep working' }))
    expect(onClose).toHaveBeenCalled()
    expect(backend.calls).toEqual([])
  })
})
