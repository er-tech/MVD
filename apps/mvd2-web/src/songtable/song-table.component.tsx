import { Box, Flex, Text } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useSyncExternalStore } from 'react'
import type { Song, Table } from '../library'
import { songColumns } from './song-columns.content.ts'
import { SongRow } from './song-row.component.tsx'
import { visibleIds } from './visible-ids.algorithm.ts'

const rowHeight = 32

interface SongTableProps {
  songs:     Table<Song>
  /** Show only the songs of this source; every song when `undefined`. */
  sourceId?: string
  selected?: string
  onSelect:  (id: string) => void
}

/**
 * The songs, as a virtual list: only the rows in view exist. A row never moves when data arrives,
 * and the chosen row is state of the page, so a change from the Go side does not touch it.
 *
 * @param props.songs - where the songs are.
 * @param props.sourceId - show only the songs of this source.
 * @param props.selected - the ID of the chosen song.
 * @param props.onSelect - called with the ID of the song that was clicked.
 */
export function SongTable ({ songs, sourceId, selected, onSelect }: SongTableProps) {
  const all = useSyncExternalStore(songs.subscribeList, songs.getOrder)
  // A song never changes its source, so the shown IDs change only when a song is added or removed.
  const ids = useMemo(() => visibleIds(all, songs, sourceId), [all, songs, sourceId])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const virtual = useVirtualizer({
    count:            ids.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize:     () => rowHeight,
    overscan:         12,
  })

  return (
    <Flex direction='column' flex='1' minH='0' minW='0'>
      <Flex gap='3' px='3' py='1' borderBottomWidth='1px' fontSize='xs' color='fg.muted' textTransform='uppercase'>
        <Text w={songColumns.position} textAlign='end'>#</Text>
        <Text w={songColumns.artist}>Artist</Text>
        <Text w={songColumns.title}>Title</Text>
        <Text w={songColumns.status}>Status</Text>
        <Text w={songColumns.version}>Version</Text>
        <Box flex='1' />
      </Flex>
      <Box ref={scrollerRef} role='table' aria-rowcount={ids.length} flex='1' overflowY='auto' minH='0'>
        {ids.length === 0 && (
          <Text p='6' color='fg.muted' textAlign='center'>
            No songs yet. Add a playlist or a song and its songs show here as they are found.
          </Text>
        )}
        <Box position='relative' style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map(item => (
            <SongRow
              key={ids[item.index]}
              id={ids[item.index]}
              songs={songs}
              top={item.start}
              height={item.size}
              selected={selected === ids[item.index]}
              onSelect={onSelect}
            />
          ))}
        </Box>
      </Box>
    </Flex>
  )
}
