import { Box, Flex, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Song, Table, Tone } from '../library'
import { countRowDraw } from '../metrics'
import { songColumns } from './song-columns.content.ts'

/** The colour token of each tone of a status. */
const toneColor: Record<Tone, string> = {
  text:      'fg',
  dim:       'fg.muted',
  focus:     'blue.fg',
  highlight: 'orange.fg',
  success:   'green.fg',
  error:     'red.fg',
}

interface SongRowProps {
  id:       string
  songs:    Table<Song>
  top:      number
  height:   number
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * One song. It listens to its own row only, so a change to another song does not draw it again, and
 * a change to this song draws nothing else.
 *
 * @param props.id - the ID of the song.
 * @param props.songs - where the songs are.
 * @param props.top - the distance from the top of the table, in pixels.
 * @param props.height - the height of the row, in pixels.
 * @param props.selected - whether the row is the chosen one.
 * @param props.onSelect - called with the ID when the row is clicked.
 */
export const SongRow = memo(function SongRow ({ id, songs, top, height, selected, onSelect }: SongRowProps) {
  const subscribe = useCallback((listener: () => void) => songs.subscribeRow(id, listener), [songs, id])
  const song = useSyncExternalStore(subscribe, () => songs.getRow(id))
  useEffect(countRowDraw)

  if (song === undefined) {
    return null
  }
  const showBar = song.percent > 0 && song.percent < 100

  return (
    <Flex
      role='row'
      aria-selected={selected}
      data-id={id}
      onClick={() => {
        onSelect(id)
      }}
      position='absolute'
      insetX='0'
      style={{ top, height }}
      align='center'
      gap='3'
      px='3'
      bg={selected ? 'bg.emphasized' : undefined}
      borderBottomWidth='1px'
      cursor='default'
    >
      <Text w={songColumns.position} color='fg.muted' textAlign='end'>{song.position}</Text>
      <Text w={songColumns.artist} truncate>{song.artist}</Text>
      <Text w={songColumns.title} truncate>{song.title}</Text>
      <Text w={songColumns.status} color={toneColor[song.tone]} truncate>{song.status}</Text>
      <Text w={songColumns.version} color='fg.muted' truncate>{song.version}</Text>
      <Box flex='1' h='2' bg={showBar ? 'bg.muted' : undefined} rounded='full' overflow='hidden'>
        {showBar && <Box h='full' bg='blue.solid' style={{ width: `${song.percent}%` }} />}
      </Box>
    </Flex>
  )
})
