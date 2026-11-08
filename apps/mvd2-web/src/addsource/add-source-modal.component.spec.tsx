import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { AddSourceModal } from './add-source-modal.component.tsx'

afterEach(cleanup)

function open () {
  const backend = fakeBackend()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <AddSourceModal open backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )

  return { backend, onClose, box: screen.getByRole<HTMLTextAreaElement>('textbox') }
}

const addButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Add' })

describe('AddSourceModal', () => {
  it('disables Add while the box is empty', () => {
    const { box } = open()
    expect(addButton().disabled).toBe(true)
    fireEvent.change(box, { target: { value: '   \n ' } })
    expect(addButton().disabled).toBe(true)
  })

  it('adds each link in order and closes', async () => {
    const { backend, onClose, box } = open()
    fireEvent.change(box, { target: { value: 'https://a\n\nhttps://b  https://c' } })
    fireEvent.click(addButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(backend.calls).toEqual(['addSource(https://a)', 'addSource(https://b)', 'addSource(https://c)'])
  })

  it('keeps a failing link with its message and stays open', async () => {
    const { backend, onClose, box } = open()
    backend.failNext.set('addSource', 'That link is not music')
    fireEvent.change(box, { target: { value: 'https://bad\nhttps://good' } })
    fireEvent.click(addButton())
    expect(await screen.findByText('That link is not music')).toBeTruthy()
    expect(backend.calls).toEqual(['addSource(https://bad)', 'addSource(https://good)'])
    expect(box.value).toBe('https://bad')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('submits with Ctrl+Enter', async () => {
    const { backend, onClose, box } = open()
    fireEvent.change(box, { target: { value: 'https://a' } })
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(backend.calls).toEqual(['addSource(https://a)'])
  })

  it('renders nothing when closed', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <AddSourceModal open={false} backend={fakeBackend()} onClose={() => undefined} />
      </ChakraProvider>,
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
