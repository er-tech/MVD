import { Flex, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Song, Table } from '../library'
import { countRowDraw } from '../metrics'
import { ProgressTag, StatusTag, VersionTag } from '../songtags'
import { rowPadding } from './song-columns.config.ts'
import type { SongColumn } from './song-columns.config.ts'

/** The columns when the table gives none. */
const defaultColumns: SongColumn[] = [
  { id: 'position', width: 56, left: rowPadding },
  { id: 'artist', width: 220, left: rowPadding + 56 },
  { id: 'title', width: 320, left: rowPadding + 276 },
  { id: 'status', width: 170 },
  { id: 'version', width: 100 },
  { id: 'progress', width: 160 },
]

interface SongRowProps {
  id:              string
  songs:           Table<Song>
  top:             number
  height:          number
  selected:        boolean
  onSelect:        (id: string) => void
  /** The shown columns, in order, with their widths in pixels and where the sticky ones stick. */
  columns?:        readonly SongColumn[]
  /** Draw the row with the tint of the odd rows. */
  striped?:        boolean
  /** The place of the source of the song in the list, for the Source # column. */
  sourcePosition?: number
}

/**
 * One song. It listens to its own row only, so a change to another song does not draw it again, and
 * a change to this song draws nothing else. The columns that stay in view when the table scrolls sideways
 * have the colour of the row, so what scrolls under them does not show.
 *
 * @param props.id - the ID of the song.
 * @param props.songs - where the songs are.
 * @param props.top - the distance from the top of the table, in pixels.
 * @param props.height - the height of the row, in pixels.
 * @param props.selected - whether the row is the chosen one.
 * @param props.onSelect - called with the ID when the row is clicked.
 * @param props.columns - the shown columns.
 * @param props.striped - whether the row has the tint of the odd rows.
 * @param props.sourcePosition - the place of the source of the song.
 */
export const SongRow = memo(function SongRow ({ id, songs, top, height, selected, onSelect, columns = defaultColumns, striped = false, sourcePosition }: SongRowProps) {
  const subscribe = useCallback((listener: () => void) => songs.subscribeRow(id, listener), [songs, id])
  const song = useSyncExternalStore(subscribe, () => songs.getRow(id))
  useEffect(countRowDraw)

  if (song === undefined) {
    return null
  }
  const background = selected ? 'blue.subtle' : (striped ? 'bg.muted' : 'bg')
  const lastSticky = columns.findLast(column => column.left !== undefined)?.id
  const cell = (column: SongColumn, content: React.ReactNode) => (
    <Flex
      key={column.id}
      flexShrink={0}
      align='center'
      pe='3'
      minW='0'
      overflow='hidden'
      style={{ width: column.width, ...(column.left !== undefined && { position: 'sticky', left: column.left, zIndex: 1 }) }}
      bg={column.left === undefined ? undefined : background}
      borderEndWidth={column.id === lastSticky ? '1px' : undefined}
    >
      {content}
    </Flex>
  )
  const contentOf = (column: SongColumn): React.ReactNode => {
    switch (column.id) {
      case 'source': { return cell(column, <Text color='fg.muted' truncate>{sourcePosition}</Text>) }
      case 'position': { return cell(column, <Text color='fg.muted' truncate>{song.position}</Text>) }
      case 'artist': { return cell(column, <Text truncate>{song.artist}</Text>) }
      case 'title': { return cell(column, <Text truncate>{song.title}</Text>) }
      case 'status': { return cell(column, <StatusTag song={song} />) }
      case 'version': { return cell(column, <VersionTag song={song} />) }
      default: { return cell(column, <ProgressTag song={song} />) }
    }
  }

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
      style={{ top, height, paddingInlineStart: rowPadding, paddingInlineEnd: rowPadding }}
      minW='full'
      align='center'
      bg={background}
      cursor='default'
    >
      {columns.map(column => contentOf(column))}
    </Flex>
  )
})
