import { CloseButton, Flex, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { Tools } from '../backend'
import type { Run } from '../library'
import { runText, speedText } from './run-text.mapper.ts'

interface StatusBarProps {
  run:       Run
  tools:     Tools
  /** A message from a command that Go refused, `` for none. */
  notice:    string
  onDismiss: () => void
  /** Something to show at the right end, such as the page's own measures. */
  children?: ReactNode
}

/**
 * The line at the bottom: what the run is doing, the speed, the state of the download tools when they
 * are not ready, and the message of a command that was refused.
 *
 * @param props.run - the state of the run.
 * @param props.tools - the state of the download tools.
 * @param props.notice - the message to show, `` for none.
 * @param props.onDismiss - called when the person closes the message.
 * @param props.children - shown at the right end.
 */
export function StatusBar ({ run, tools, notice, onDismiss, children }: StatusBarProps) {
  const speed = speedText(run.speed)

  return (
    <Flex align='center' gap='4' px='3' py='1' borderTopWidth='1px' fontSize='sm' minH='8'>
      {!tools.ready && <Text color={tools.failed ? 'red.fg' : 'orange.fg'}>{tools.message}</Text>}
      {tools.ready && notice === '' && <Text>{runText(run)}</Text>}
      {notice !== '' && (
        <Flex align='center' gap='2' color='red.fg'>
          <Text>{notice}</Text>
          <CloseButton size='2xs' aria-label='Dismiss' onClick={onDismiss} />
        </Flex>
      )}
      <Text flex='1' />
      {speed !== '' && <Text color='fg.muted'>{speed}</Text>}
      {children}
    </Flex>
  )
}
