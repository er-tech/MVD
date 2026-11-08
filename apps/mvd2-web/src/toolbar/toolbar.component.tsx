import { Button, ButtonGroup, Flex, Heading, Spacer } from '@chakra-ui/react'
import type { Backend } from '../backend'
import type { Run } from '../library'
import { toolbarButtons } from './toolbar-buttons.policy.ts'

interface ToolbarProps {
  backend:    Backend
  run:        Run
  toolsReady: boolean
  /** Called when the person presses Add music: the page opens its window. */
  onAdd:      () => void
  /** Called with the message of a command that Go refused, for the page to show. */
  onError:    (message: string) => void
}

/**
 * The bar at the top: the title and the buttons of the run. Each button asks the Go side to do the
 * work and returns at once, and Go answers through the batches of changes.
 *
 * @param props.backend - the Go side.
 * @param props.run - the state of the run, which says what each button may do.
 * @param props.toolsReady - whether the download tools are there.
 * @param props.onAdd - called when the person presses Add music.
 * @param props.onError - called with the message of a refused command.
 */
export function Toolbar ({ backend, run, toolsReady, onAdd, onError }: ToolbarProps) {
  const buttons = toolbarButtons(run, toolsReady)
  const ask = (command: () => Promise<unknown>) => async () => {
    try {
      await command()
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Flex align='center' gap='3' px='3' py='2' borderBottomWidth='1px'>
      <Heading size='md'>MVD</Heading>
      <ButtonGroup size='sm'>
        <Button colorPalette='blue' disabled={!buttons.add} onClick={onAdd}>Add music</Button>
        <Button colorPalette='green' disabled={!buttons.start} onClick={ask(backend.start)}>Start</Button>
        {buttons.resume
          ? <Button variant='outline' onClick={ask(backend.resume)}>Resume</Button>
          : <Button variant='outline' disabled={!buttons.pause} onClick={ask(backend.pause)}>Pause</Button>}
        <Button variant='outline' disabled={!buttons.retry} onClick={ask(backend.retryFailed)}>Retry failed</Button>
      </ButtonGroup>
      <Spacer />
      <Button size='sm' variant='ghost' onClick={ask(backend.openOutputFolder)}>Open folder</Button>
    </Flex>
  )
}
