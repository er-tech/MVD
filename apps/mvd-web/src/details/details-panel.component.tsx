import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import type { Backend } from '../backend'
import type { LibraryStore } from '../library'
import type { Selection } from './selection.contract.ts'
import { LogList } from './log-list.component.tsx'
import { useDetail } from './use-detail.hook.ts'

interface DetailsPanelProps {
  backend:    Backend
  store:      LibraryStore
  selection?: Selection
}

/** The words of a song that is being worked on, so the last line of its log is a step that goes on. */
const workingStatuses = new Set(['finding', 'starting', 'downloading', 'joining'])

/** How many lines of the log the panel keeps in view. */
const logLines = 40

/**
 * The panel on the right. It follows the selection: for a playlist it gives all there is to know of it
 * and a link to it, for a song all the details and the links to its videos (the one in the playlist,
 * the official video found, the best audio found).
 *
 * @param props.backend - the Go side, for the details and to open a link.
 * @param props.store - the library, to follow the selected row as it changes.
 * @param props.selection - the chosen item, `undefined` for none.
 */
export function DetailsPanel ({ backend, store, selection }: DetailsPanelProps) {
  const { detail, error } = useDetail(backend, store, selection)

  const status = selection?.kind === 'song' ? store.songs.getRow(selection.id)?.status : undefined
  const working = status !== undefined && workingStatuses.has(status)

  if (selection === undefined) {
    return (
      <Box p='4' color='fg.muted' fontSize='sm' data-testid='details-empty'>
        Choose a playlist or a song to see all about it.
      </Box>
    )
  }
  if (error !== undefined) {
    return <Box p='4' color='red.fg' fontSize='sm'>{error}</Box>
  }
  if (detail === undefined) {
    return null
  }

  return (
    <Stack p='4' gap='4' overflowY='auto' minH='0' data-testid='details'>
      <Box>
        <Text fontSize='xs' color='fg.muted' textTransform='uppercase'>{detail.kind === 'song' ? 'Song' : 'Playlist'}</Text>
        <Heading size='md' lineClamp='3'>{detail.title}</Heading>
      </Box>
      <Stack as='dl' gap='2' m='0'>
        {detail.fields.map(field => (
          <Box key={field.label}>
            <Text as='dt' fontSize='xs' color='fg.muted'>{field.label}</Text>
            <Text as='dd' m='0' wordBreak='break-word'>{field.value}</Text>
          </Box>
        ))}
      </Stack>
      {detail.links.length > 0 && (
        <Stack gap='2'>
          {detail.links.map(link => (
            <Button
              key={link.label}
              size='sm'
              variant='outline'
              justifyContent='flex-start'
              onClick={() => {
                void backend.openLink(link.url)
              }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      )}
      {detail.log.length > 0 && (
        <Box>
          <Text fontSize='xs' color='fg.muted'>Log</Text>
          <LogList lines={detail.log.slice(-logLines)} working={working} />
        </Box>
      )}
    </Stack>
  )
}
