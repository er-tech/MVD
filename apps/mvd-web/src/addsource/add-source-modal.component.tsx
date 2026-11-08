import { Alert, Button, Field, Stack, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Backend } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link AddSourceModal}. */
export interface AddSourceModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that takes the links. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

interface LinkFailure {
  url:     string
  message: string
}

const splitLinks = (text: string): string[] => text.split(/\s+/).filter(link => link !== '')

function AddSourceForm ({ backend, onClose }: Omit<AddSourceModalProps, 'open'>) {
  const [text, setText] = useState('')
  const [failures, setFailures] = useState<LinkFailure[]>([])
  const [working, setWorking] = useState(false)
  const canAdd = !working && splitLinks(text).length > 0

  const add = async () => {
    if (!canAdd) return
    setWorking(true)
    const failed: LinkFailure[] = []
    for (const url of splitLinks(text)) {
      try {
        await backend.addSource(url)
      } catch (error) {
        failed.push({ url, message: error instanceof Error ? error.message : String(error) })
      }
    }
    setWorking(false)
    if (failed.length === 0) {
      onClose()

      return
    }
    setText(failed.map(failure => failure.url).join('\n'))
    setFailures(failed)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.key === 'Enter' && event.ctrlKey)) {
      return
    }

    event.preventDefault()
    void add()
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Add music'
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Cancel</Button>
          <Button onClick={() => void add()} disabled={!canAdd} loading={working}>Add</Button>
        </>
      )}
    >
      <Stack gap='3'>
        <Field.Root>
          <Field.Label>Links, one on each line</Field.Label>
          <Textarea
            rows={6}
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Paste a playlist, an album or a song link'
          />
        </Field.Root>
        {failures.map(failure => (
          <Alert.Root key={failure.url} status='error'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{failure.url}</Alert.Title>
              <Alert.Description>{failure.message}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ))}
      </Stack>
    </ModalFrame>
  )
}

/**
 * The window where the person pastes links to add to the list.
 *
 * Each link goes to the backend in order. A link that fails stays in the box with its message.
 * The modal closes when every link went in.
 *
 * @param props - see {@link AddSourceModalProps}.
 * @returns the modal, or nothing when closed.
 */
export function AddSourceModal ({ open, backend, onClose }: AddSourceModalProps) {
  return open ? <AddSourceForm backend={backend} onClose={onClose} /> : null
}
