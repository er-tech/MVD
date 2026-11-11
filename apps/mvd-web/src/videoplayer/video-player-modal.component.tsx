import { AspectRatio, Button } from '@chakra-ui/react'
import { ModalFrame } from '../modalframe'
import { videoIdOf } from './video-id.algorithm.ts'

/** The props of {@link VideoPlayerModal}. */
export interface VideoPlayerModalProps {
  /** The address of the video to play, `undefined` while the modal is closed. */
  url?:           string
  /** What the video is, for the heading. */
  title:          string
  /** Called when the person asks to see the video in the browser instead. */
  onOpenExternal: (url: string) => void
  /** Called when the modal closes. */
  onClose:        () => void
}

/**
 * Plays a YouTube video inside the app with the embed player. Some videos cannot be embedded: the player then says
 * so, and the Open in browser button plays it there.
 *
 * @param props - see {@link VideoPlayerModalProps}.
 * @returns the modal, or nothing while there is no video to play.
 */
export function VideoPlayerModal ({ url, title, onOpenExternal, onClose }: VideoPlayerModalProps) {
  const id = url === undefined ? undefined : videoIdOf(url)
  if (url === undefined || id === undefined) {
    return null
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title={title}
      size='xl'
      footer={(
        <>
          <Button variant='ghost' onClick={() => { onOpenExternal(url) }}>Open in browser</Button>
          <Button onClick={onClose}>Close</Button>
        </>
      )}
    >
      <AspectRatio ratio={16 / 9} bg='black'>
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
          allowFullScreen
          referrerPolicy='strict-origin-when-cross-origin'
        />
      </AspectRatio>
    </ModalFrame>
  )
}
