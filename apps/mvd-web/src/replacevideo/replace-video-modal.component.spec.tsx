import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { ReplaceVideoModal } from './replace-video-modal.component.tsx'

afterEach(cleanup)

function open (songId: string | undefined) {
  const backend = fakeBackend()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <ReplaceVideoModal songId={songId} name='Daft Punk - One More Time' backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )

  return { backend, onClose }
}

const replaceButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Replace' })

describe('ReplaceVideoModal', () => {
  it('shows nothing while no song is chosen', () => {
    open(undefined)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('names the song and disables Replace while the field is empty', () => {
    open('e3')
    expect(screen.getByText('Daft Punk - One More Time')).toBeTruthy()
    expect(replaceButton().disabled).toBe(true)
  })

  it('gives the link to the backend and closes', async () => {
    const { backend, onClose } = open('e3')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(replaceButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(backend.calls).toEqual(['replaceVideo(e3, https://youtu.be/dQw4w9WgXcQ)'])
  })

  it('shows why Go refused the video and stays open', async () => {
    const { backend, onClose } = open('e3')
    backend.failNext.set('replaceVideo', 'write a YouTube video link or its ID')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nope' } })
    fireEvent.click(replaceButton())
    expect(await screen.findByText('write a YouTube video link or its ID')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })
})
