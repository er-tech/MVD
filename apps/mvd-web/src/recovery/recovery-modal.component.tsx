import { Alert, Button, Text } from '@chakra-ui/react'
import { useState } from 'react'
import type { Backend, ListInfo } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link RecoveryModal}. */
export interface RecoveryModalProps {
  /** The list the last run left. */
  info:    ListInfo
  /** The Go side that opens or discards the list. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

const plural = (count: number, one: string, many: string) => `${String(count)} ${count === 1 ? one : many}`
const messageOf = (reason: unknown) => reason instanceof Error ? reason.message : String(reason)

/**
 * The question asked at start when the last run left a list: take it up or start fresh.
 *
 * Continue opens the list. A refusal shows in the modal, which stays open.
 * Start fresh discards the list and closes.
 *
 * @param props - see {@link RecoveryModalProps}.
 * @returns the modal, always open: the caller decides when to render it.
 */
export function RecoveryModal ({ info, backend, onClose }: RecoveryModalProps) {
  const [error, setError] = useState('')

  const run = async (action: () => Promise<void>) => {
    try {
      await action()
      onClose()
    } catch (error_) {
      setError(messageOf(error_))
    }
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Take up the list from last time?'
      footer={(
        <>
          <Button variant='ghost' onClick={() => void run(() => backend.discardRecovery())}>Start fresh</Button>
          <Button onClick={() => void run(() => backend.openListPath(info.path))}>Continue</Button>
        </>
      )}
    >
      <Text>
        The last list has {plural(info.sources, 'link', 'links')} and {plural(info.songs, 'song', 'songs')}.
      </Text>
      {error !== '' && (
        <Alert.Root status='error' mt='3'>
          <Alert.Indicator />
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}
    </ModalFrame>
  )
}
