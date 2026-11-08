import { Button, Heading, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link AboutModal}. */
export interface AboutModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that knows the version and opens links. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

/** The page of the project. */
const projectPage = 'https://github.com/er-tech/MVD'

/**
 * The window that says what MVD is and which version runs.
 *
 * @param props - see {@link AboutModalProps}.
 * @returns the modal.
 */
export function AboutModal ({ open, backend, onClose }: AboutModalProps) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!open) return
    let current = true
    const load = async () => {
      try {
        const value = await backend.version()
        if (current) setVersion(value)
      } catch {
        // The version is a courtesy: the modal works without it.
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [open, backend])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title='About'
      size='sm'
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Heading size='lg'>MVD</Heading>
      <Text color='fg.muted' mb='3'>Version {version}</Text>
      <Text mb='4'>MVD downloads the music of your playlists to your computer.</Text>
      <Button variant='outline' onClick={() => void backend.openLink(projectPage)}>Open the project page</Button>
    </ModalFrame>
  )
}
