import { Button, Heading, HStack, Text } from '@chakra-ui/react'
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
  const [note, setNote] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!open) return
    let current = true
    const load = async () => {
      try {
        const [value, known] = await Promise.all([backend.version(), backend.updateNote()])
        if (current) {
          setVersion(value)
          setNote(known)
        }
      } catch {
        // The version is a courtesy: the modal works without it.
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [open, backend])

  const check = async () => {
    setChecking(true)
    try {
      setNote(await backend.checkForUpdate())
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error))
    } finally {
      setChecking(false)
    }
  }

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
      {note !== '' && <Text mb='4' data-testid='update-note'>{note}</Text>}
      <HStack>
        <Button variant='outline' onClick={() => void backend.openLink(projectPage)}>Open the project page</Button>
        <Button variant='outline' loading={checking} onClick={() => void check()}>Check for updates</Button>
      </HStack>
    </ModalFrame>
  )
}
