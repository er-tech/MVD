import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useSyncExternalStore } from 'react'
import type { RowsStore } from '../rowstore'
import { SongRow } from './song-row.component.tsx'

const rowHeight = 32

/**
 * The songs, as a virtual list: only the rows in view exist. A row never moves when data arrives,
 * and the chosen row is state of the page, so a change from the Go side does not touch it.
 *
 * @param props.store - where the rows are.
 */
export function SongTable ({ store }: { store: RowsStore }) {
  const ids = useSyncExternalStore(store.subscribeList, store.getOrder)
  const [selected, setSelected] = useState<string | undefined>()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const virtual = useVirtualizer({
    count:            ids.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize:     () => rowHeight,
    overscan:         12,
  })

  return (
    <Box ref={scrollerRef} role='table' aria-rowcount={ids.length} flex='1' overflowY='auto' minH='0'>
      <Box position='relative' style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map(item => (
          <SongRow
            key={ids[item.index]}
            id={ids[item.index]}
            store={store}
            top={item.start}
            height={item.size}
            selected={selected === ids[item.index]}
            onSelect={setSelected}
          />
        ))}
      </Box>
    </Box>
  )
}
