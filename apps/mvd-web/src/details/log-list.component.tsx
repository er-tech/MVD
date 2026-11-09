import { Icon, List, Spinner } from '@chakra-ui/react'

interface LogListProps {
  /** The lines of the log, oldest first. */
  lines:   readonly string[]
  /** True while the item is still being worked on: the last line is then a step that goes on. */
  working: boolean
}

function Check () {
  return (
    <Icon color='green.fg' boxSize='4' aria-hidden>
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='12' r='9' />
        <path d='m8 12.5 3 3 5-6' />
      </svg>
    </Icon>
  )
}

/**
 * The log of a source or a song as a list, one line for each step. A step that is over has a tick. While the item
 * is still being worked on, the last step has a spinner, because it is the one that goes on.
 *
 * @param props.lines - the lines of the log.
 * @param props.working - whether the item is still being worked on.
 */
export function LogList ({ lines, working }: LogListProps) {
  return (
    <List.Root variant='plain' gap='2' fontSize='xs' bg='bg.muted' p='3' rounded='md' maxH='64' overflowY='auto' aria-label='Log'>
      {lines.map((line, index) => (
        // The log only grows at its end, so the place of a line is its identity.
        // eslint-disable-next-line @eslint-react/no-array-index-key
        <List.Item key={index} alignItems='flex-start' wordBreak='break-word'>
          <List.Indicator asChild mt='0.5'>
            {working && index === lines.length - 1 ? <Spinner size='xs' color='green.fg' aria-label='In progress' /> : <Check />}
          </List.Indicator>
          {line}
        </List.Item>
      ))}
    </List.Root>
  )
}
