import { Button, Text } from '@chakra-ui/react'
import type { Backend } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link QuitQuestionModal}. */
export interface QuitQuestionModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that closes the window. */
  backend: Backend
  /** Called when the person keeps working. */
  onClose: () => void
}

/**
 * The question asked when the window is asked to close while downloads run.
 *
 * @param props - see {@link QuitQuestionModalProps}.
 * @returns the modal.
 */
export function QuitQuestionModal ({ open, backend, onClose }: QuitQuestionModalProps) {
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title='Quit MVD?'
      size='sm'
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Keep working</Button>
          <Button colorPalette='red' onClick={() => void backend.confirmQuit()}>Quit</Button>
        </>
      )}
    >
      <Text>Downloads are running. Quit now?</Text>
    </ModalFrame>
  )
}
