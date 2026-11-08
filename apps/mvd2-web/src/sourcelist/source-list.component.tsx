import { Box, Text } from '@chakra-ui/react'
import { useSyncExternalStore } from 'react'
import type { Source, Table } from '../library'
import { SourceRow } from './source-row.component.tsx'

interface SourceListProps {
  sources:   Table<Source>
  selected?: string
  onSelect:  (id: string) => void
  onRemove:  (id: string) => void
}

/**
 * The sources the person added, in the order they were added. The list is short, so every row is a
 * component of its own that listens to its own source.
 *
 * @param props.sources - where the sources are.
 * @param props.selected - the ID of the chosen source.
 * @param props.onSelect - called with the ID of the source that was clicked.
 * @param props.onRemove - called with the ID of the source to remove.
 */
export function SourceList ({ sources, selected, onSelect, onRemove }: SourceListProps) {
  const ids = useSyncExternalStore(sources.subscribeList, sources.getOrder)

  return (
    <Box role='table' aria-label='Sources' overflowY='auto' minH='0' flex='1'>
      {ids.length === 0 && (
        <Text p='4' color='fg.muted' fontSize='sm'>
          Nothing added yet. Use Add music to put in a playlist, an album or a song.
        </Text>
      )}
      {ids.map(id => (
        <SourceRow key={id} id={id} sources={sources} selected={selected === id} onSelect={onSelect} onRemove={onRemove} />
      ))}
    </Box>
  )
}
