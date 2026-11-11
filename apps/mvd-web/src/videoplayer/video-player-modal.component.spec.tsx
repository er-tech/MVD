import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VideoPlayerModal } from './video-player-modal.component.tsx'

afterEach(cleanup)

function open (url: string | undefined) {
  const onOpenExternal = vi.fn<(url: string) => void>()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <VideoPlayerModal url={url} title='Official video' onOpenExternal={onOpenExternal} onClose={onClose} />
    </ChakraProvider>,
  )

  return { onOpenExternal, onClose }
}

describe('VideoPlayerModal', () => {
  it('plays the video in the embed player', () => {
    open('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(screen.getByTitle('Official video').getAttribute('src')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('shows nothing for no video or an address that is not one', () => {
    open(undefined)
    open('https://www.youtube.com/playlist?list=PL1')
    expect(screen.queryByTitle('Official video')).toBeNull()
  })

  it('hands the address to the browser on request', () => {
    const { onOpenExternal } = open('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    fireEvent.click(screen.getByRole('button', { name: 'Open in browser' }))
    expect(onOpenExternal).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})
