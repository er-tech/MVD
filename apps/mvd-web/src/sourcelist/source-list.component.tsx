import { Box, Text } from '@chakra-ui/react'
import { useSyncExternalStore } from 'react'
import { ContextMenu } from '../contextmenu'
import type { MenuEntry } from '../contextmenu'
import type { Source, Table } from '../library'
import { SourceRow } from './source-row.component.tsx'

interface SourceListProps {
  sources:    Table<Source>
  selected?:  string
  onSelect:   (id: string) => void
  onRemove:   (id: string) => void
  /** The entries of the right-click menu of a source. */
  entriesFor: (id: string) => Promise<MenuEntry[]>
}

/**
 * The sources the person added, in the order they were added. The list is short, so every row is a
 * component of its own that listens to its own source. A right click on a source opens its menu.
 *
 * @param props.sources - where the sources are.
 * @param props.selected - the ID of the chosen source.
 * @param props.onSelect - called with the ID of the source that was clicked.
 * @param props.onRemove - called with the ID of the source to remove.
 * @param props.entriesFor - the entries of the right-click menu of a source.
 */
export function SourceList ({ sources, selected, onSelect, onRemove, entriesFor }: SourceListProps) {
  const ids = useSyncExternalStore(sources.subscribeList, sources.getOrder)

  return (
    <ContextMenu entriesFor={entriesFor} onTarget={onSelect} flex='1' minH='0'>
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
    </ContextMenu>
  )
}
