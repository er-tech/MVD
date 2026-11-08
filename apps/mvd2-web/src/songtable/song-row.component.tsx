import { Box, Flex, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useSyncExternalStore } from 'react'
import { countRowDraw } from '../metrics'
import type { RowsStore } from '../rowstore'

interface SongRowProps {
  id:       string
  store:    RowsStore
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
 * @param props.store - where the rows are.
 * @param props.top - the distance from the top of the table, in pixels.
 * @param props.height - the height of the row, in pixels.
 * @param props.selected - whether the row is the chosen one.
 * @param props.onSelect - called with the ID when the row is clicked.
 */
export const SongRow = memo(function SongRow ({ id, store, top, height, selected, onSelect }: SongRowProps) {
  const subscribe = useCallback((listener: () => void) => store.subscribeRow(id, listener), [store, id])
  const row = useSyncExternalStore(subscribe, () => store.getRow(id))
  useEffect(countRowDraw)

  if (row === undefined) {
    return null
  }

  return (
    <Flex
      role='row'
      aria-selected={selected}
      data-id={id}
      onClick={() => onSelect(id)}
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
      <Text w='20%' truncate>{row.artist}</Text>
      <Text w='36%' truncate>{row.title}</Text>
      <Text w='14%' color='fg.muted'>{row.status}</Text>
      <Box flex='1' h='2' bg='bg.muted' rounded='full' overflow='hidden'>
        <Box h='full' bg='blue.solid' style={{ width: `${row.percent}%` }} />
      </Box>
    </Flex>
  )
})
