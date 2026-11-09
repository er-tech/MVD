import { Box, Text } from '@chakra-ui/react'
import { Reorder } from 'motion/react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { ContextMenu } from '../contextmenu'
import type { MenuEntry } from '../contextmenu'
import type { Source, Table } from '../library'
import { SourceRow } from './source-row.component.tsx'

interface SourceListProps {
  sources:    Table<Source>
  selected?:  string
  onSelect:   (id: string) => void
  onRemove:   (id: string) => void
  /** Called with the ID of a source the person dragged and the place, from 1, where it was dropped. */
  onMove:     (id: string, place: number) => void
  /** The entries of the right-click menu of a source. */
  entriesFor: (id: string) => Promise<MenuEntry[]>
}

/**
 * The sources the person added, in the order of the list, which the person changes by dragging a source. The list is short, so every row is a
 * component of its own that listens to its own source. A right click on a source opens its menu.
 *
 * @param props.sources - where the sources are.
 * @param props.selected - the ID of the chosen source.
 * @param props.onSelect - called with the ID of the source that was clicked.
 * @param props.onRemove - called with the ID of the source to remove.
 * @param props.onMove - called when the person drops a source at another place of the list.
 * @param props.entriesFor - the entries of the right-click menu of a source.
 */
export function SourceList ({ sources, selected, onSelect, onRemove, onMove, entriesFor }: SourceListProps) {
  const ids = useSyncExternalStore(sources.subscribeList, sources.getOrder)
  // While a source is dragged the order is the person's; it goes back to the store's when that changes.
  const [dragged, setDragged] = useState<readonly string[] | undefined>()
  const [seen, setSeen] = useState(ids)
  if (seen !== ids) {
    setSeen(ids)
    setDragged(undefined)
  }
  const order = dragged ?? ids
  const orderRef = useRef(order)
  orderRef.current = order
  const drop = (id: string): void => {
    const place = orderRef.current.indexOf(id) + 1
    if (place > 0 && place !== sources.getRow(id)?.position) {
      onMove(id, place)
    }
  }

  return (
    <ContextMenu entriesFor={entriesFor} onTarget={onSelect} flex='1' minH='0'>
      <Box role='table' aria-label='Sources' overflowY='auto' minH='0' flex='1'>
        {ids.length === 0 && (
          <Text p='4' color='fg.muted' fontSize='sm'>
            Nothing added yet. Use Add music to put in a playlist, an album or a song.
          </Text>
        )}
        <Reorder.Group as='div' axis='y' values={[...order]} onReorder={next => { setDragged(next) }}>
          {order.map(id => (
            <Reorder.Item
              key={id}
              as='div'
              value={id}
              style={{ position: 'relative', cursor: 'grab' }}
              whileDrag={{ scale: 1.02, boxShadow: '0 4px 14px rgba(0,0,0,0.35)', zIndex: 2 }}
              onDragEnd={() => { drop(id) }}
            >
              <SourceRow id={id} sources={sources} selected={selected === id} onSelect={onSelect} onRemove={onRemove} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </Box>
    </ContextMenu>
  )
}
