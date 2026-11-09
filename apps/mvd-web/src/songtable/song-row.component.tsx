import { Box, Flex, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Song, Table, Tone } from '../library'
import { countRowDraw } from '../metrics'

/** The colour token of each tone of a status. */
const toneColor: Record<Tone, string> = {
  text:      'fg',
  dim:       'fg.muted',
  focus:     'blue.fg',
  highlight: 'orange.fg',
  success:   'green.fg',
  error:     'red.fg',
}

/** The widths of the columns when the table gives none, in pixels: #, artist, title, status, version, progress. */
const defaultWidths = [56, 220, 320, 170, 100, 160]

interface SongRowProps {
  id:       string
  songs:    Table<Song>
  top:      number
  height:   number
  selected: boolean
  onSelect: (id: string) => void
  /** The width of each column in pixels, in the order # artist title status version progress. */
  widths?:  readonly number[]
  /** Draw the row with the tint of the odd rows. */
  striped?: boolean
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
 * @param props.widths - the width of each column.
 * @param props.striped - whether the row has the tint of the odd rows.
 */
export const SongRow = memo(function SongRow ({ id, songs, top, height, selected, onSelect, widths = defaultWidths, striped = false }: SongRowProps) {
  const subscribe = useCallback((listener: () => void) => songs.subscribeRow(id, listener), [songs, id])
  const song = useSyncExternalStore(subscribe, () => songs.getRow(id))
  useEffect(countRowDraw)

  if (song === undefined) {
    return null
  }
  const showBar = song.percent > 0 && song.percent < 100
  const [position, artist, title, status, version, progress] = widths

  return (
    <Flex
      role='row'
      aria-selected={selected}
      data-id={id}
      onClick={() => {
        onSelect(id)
      }}
      position='absolute'
      insetStart='0'
      style={{ top, height }}
      minW='full'
      align='center'
      px='3'
      bg={selected ? 'blue.subtle' : (striped ? 'bg.muted' : undefined)}
      cursor='default'
    >
      <Text w={`${String(position)}px`} flexShrink={0} pe='3' color='fg.muted' textAlign='end'>{song.position}</Text>
      <Text w={`${String(artist)}px`} flexShrink={0} pe='3' truncate>{song.artist}</Text>
      <Text w={`${String(title)}px`} flexShrink={0} pe='3' truncate>{song.title}</Text>
      <Text w={`${String(status)}px`} flexShrink={0} pe='3' color={toneColor[song.tone]} truncate>{song.status}</Text>
      <Text w={`${String(version)}px`} flexShrink={0} pe='3' color='fg.muted' truncate>{song.version}</Text>
      <Box w={`${String(progress)}px`} flexShrink={0} h='2' bg={showBar ? 'bg.emphasized' : undefined} rounded='full' overflow='hidden'>
        {showBar && <Box h='full' bg='blue.solid' style={{ width: `${song.percent}%` }} />}
      </Box>
    </Flex>
  )
})
