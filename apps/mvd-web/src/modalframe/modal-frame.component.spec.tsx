import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalFrame } from './modal-frame.component.tsx'

afterEach(cleanup)

function frame (open: boolean) {
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <ModalFrame open={open} onClose={onClose} title='A title' footer={<button>Footer button</button>}>
        <p>Body text</p>
      </ModalFrame>
    </ChakraProvider>,
  )

  return onClose
}

describe('ModalFrame', () => {
  it('shows the title, the body and the footer when open', () => {
    frame(true)
    expect(screen.getByText('A title')).toBeTruthy()
    expect(screen.getByText('Body text')).toBeTruthy()
    expect(screen.getByText('Footer button')).toBeTruthy()
  })

  it('shows nothing when closed', () => {
    frame(false)
    expect(screen.queryByText('A title')).toBeNull()
  })

  it('asks to close on Escape', async () => {
    const onClose = frame(true)
    await waitFor(() => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
