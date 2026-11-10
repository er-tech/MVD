import { Alert, Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import type { Backend } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link ReplaceVideoModal}. */
export interface ReplaceVideoModalProps {
  /** The ID of the song to give another video, `undefined` while the modal is closed. */
  songId?: string
  /** The name of the song, for the heading. */
  name:    string
  /** The Go side that takes the video. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

function ReplaceVideoForm ({ songId, name, backend, onClose }: Required<ReplaceVideoModalProps>) {
  const [text, setText] = useState('')
  const [failure, setFailure] = useState('')
  const [working, setWorking] = useState(false)
  const canReplace = !working && text.trim() !== ''

  const replace = async () => {
    if (!canReplace) return
    setWorking(true)
    try {
      await backend.replaceVideo(songId, text)
      onClose()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
      setWorking(false)
    }
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Replace the video'
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Cancel</Button>
          <Button onClick={() => void replace()} disabled={!canReplace} loading={working}>Replace</Button>
        </>
      )}
    >
      <Stack gap='3'>
        <Text color='fg.muted'>{name}</Text>
        <Field.Root>
          <Field.Label>YouTube video link or ID</Field.Label>
          <Input
            value={text}
            placeholder='https://www.youtube.com/watch?v=...'
            onChange={event => { setText(event.target.value) }}
            onKeyDown={event => {
              if (event.key !== 'Enter') {
                return
              }

              event.preventDefault()
              void replace()
            }}
          />
          <Field.HelperText>
            The song downloads this video, and the video you chose stays for retries. A song that is already saved is saved again.
          </Field.HelperText>
        </Field.Root>
        {failure !== '' && (
          <Alert.Root status='error'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{failure}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
      </Stack>
    </ModalFrame>
  )
}

/**
 * The window where the person gives a song another video, for when the one that was found is not the best.
 *
 * @param props - see {@link ReplaceVideoModalProps}.
 * @returns the modal, or nothing while no song is chosen.
 */
export function ReplaceVideoModal ({ songId, name, backend, onClose }: ReplaceVideoModalProps) {
  return songId === undefined ? null : <ReplaceVideoForm songId={songId} name={name} backend={backend} onClose={onClose} />
}
