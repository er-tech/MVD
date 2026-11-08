import { Box, CloseButton, Flex, Text } from '@chakra-ui/react'
import { memo, useCallback, useSyncExternalStore } from 'react'
import type { Source, Table } from '../library'

interface SourceRowProps {
  id:       string
  sources:  Table<Source>
  selected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

/** The line under the title: how far the source is, in words. */
function summary (source: Source): string {
  switch (source.status) {
    case 'failed': {
      return source.error === '' ? 'Could not be loaded' : source.error
    }
    case 'listing': {
      return 'Loading…'
    }
    default: {
      return source.failed > 0
        ? `${source.done} of ${source.songs} saved, ${source.failed} failed`
        : `${source.done} of ${source.songs} saved`
    }
  }
}

/**
 * One source. It listens to its own row only, so a change to another source does not draw it again.
 *
 * @param props.id - the ID of the source.
 * @param props.sources - where the sources are.
 * @param props.selected - whether the source is the chosen one.
 * @param props.onSelect - called with the ID when the source is clicked.
 * @param props.onRemove - called with the ID when the person removes the source.
 */
export const SourceRow = memo(function SourceRow ({ id, sources, selected, onSelect, onRemove }: SourceRowProps) {
  const subscribe = useCallback((listener: () => void) => sources.subscribeRow(id, listener), [sources, id])
  const source = useSyncExternalStore(subscribe, () => sources.getRow(id))
  if (source === undefined) {
    return null
  }

  return (
    <Flex
      role='row'
      aria-selected={selected}
      data-id={id}
      onClick={() => {
        onSelect(id)
      }}
      align='center'
      gap='2'
      px='3'
      py='2'
      bg={selected ? 'bg.emphasized' : undefined}
      borderBottomWidth='1px'
      cursor='default'
    >
      <Box flex='1' minW='0'>
        <Text truncate fontWeight='medium'>{source.title}</Text>
        <Text truncate fontSize='xs' color={source.status === 'failed' ? 'red.fg' : 'fg.muted'}>{summary(source)}</Text>
      </Box>
      <CloseButton
        size='2xs'
        aria-label={`Remove ${source.title}`}
        onClick={event => {
          event.stopPropagation()
          onRemove(id)
        }}
      />
    </Flex>
  )
})
