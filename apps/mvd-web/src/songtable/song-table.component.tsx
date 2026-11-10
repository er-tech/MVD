import { Box, CloseButton, Flex, Input, InputGroup, Text } from '@chakra-ui/react'
import {
  getCoreRowModel, getFacetedRowModel, getFacetedUniqueValues, getFilteredRowModel, getSortedRowModel, useReactTable,
} from '@tanstack/react-table'
import type { Column, SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ContextMenu } from '../contextmenu'
import type { MenuEntry } from '../contextmenu'
import type { Song, Source, Table } from '../library'
import { songMatches } from './fuzzy-match.algorithm.ts'
import { audioLook, progressLabels, versionLook } from '../songtags'
import { ColumnFilter } from './column-filter.component.tsx'
import type { FilterOption } from './column-filter.component.tsx'
import { filterColumnIds, rowPadding, songColumns } from './song-columns.config.ts'
import type { SongLine } from './song-columns.config.ts'
import { SongRow } from './song-row.component.tsx'
import { visibleIds } from './visible-ids.algorithm.ts'

const rowHeight = 32

interface SongTableProps {
  songs:      Table<Song>
  /** Where the sources are, for the Source # column. */
  sources:    Table<Source>
  /** Show only the songs of this source; every song when `undefined`. */
  sourceId?:  string
  selected?:  string
  onSelect:   (id: string) => void
  /** The entries of the right-click menu of a song. */
  entriesFor: (id: string) => Promise<MenuEntry[]>
}

/** The choices of the filter of a column: every value the column holds, in words. */
function optionsOf (column: Column<SongLine>): FilterOption[] {
  const values = Array.from(column.getFacetedUniqueValues().keys(), String).sort((a, b) => a.localeCompare(b))
  if (column.id === 'progress') {
    return Object.entries(progressLabels).filter(([value]) => values.includes(value)).map(([value, label]) => ({ value, label }))
  }

  const named = (value: string) => {
    switch (column.id) {
      case 'version': { return versionLook(value)?.label ?? 'Not known yet' }
      case 'audio': { return audioLook(value)?.label ?? 'None' }
      default: { return value }
    }
  }

  return values.map(value => ({ value, label: named(value) }))
}

/** True when the keys belong to a field, a window or a button, not to the list. */
function keysBelongElsewhere (target: EventTarget | null): boolean {
  return (target instanceof HTMLElement && target.closest('input, textarea, select, button, [role="dialog"], [contenteditable]') !== null) ||
    document.querySelector('[role="dialog"]') !== null
}

/**
 * The songs, as a virtual table with a search field, sorting by a column and columns the person can widen. Only the
 * rows in view exist, and each listens to its own song, so a download that moves does not draw the others.
 *
 * The order and the search are worked out when the list, the sort or the search changes, not at every step of a
 * download, so a column sorted by status settles when the person sorts again.
 *
 * The arrows move the chosen song up and down the rows that are shown.
 *
 * @param props.songs - where the songs are.
 * @param props.sources - where the sources are: the Source # column shows only when every source is shown.
 * @param props.sourceId - show only the songs of this source.
 * @param props.selected - the ID of the chosen song.
 * @param props.onSelect - called with the ID of the song that was clicked, or reached with the arrows.
 * @param props.entriesFor - the entries of the right-click menu of a song.
 */
export function SongTable ({ songs, sources, sourceId, selected, onSelect, entriesFor }: SongTableProps) {
  const all = useSyncExternalStore(songs.subscribeList, songs.getOrder)
  // A song never changes its source, so the shown IDs change only when a song is added or removed.
  const ids = useMemo(() => visibleIds(all, songs, sourceId), [all, songs, sourceId])
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  // A source that is moved or removed changes the order of the sources, and so the Source # of its songs.
  const sourceOrder = useSyncExternalStore(sources.subscribeList, sources.getOrder)
  const data = useMemo(() => {
    void sorting
    void sourceOrder
    const rows: SongLine[] = []
    for (const id of ids) {
      const song = songs.getRow(id)
      if (song !== undefined) {
        rows.push({ ...song, sourcePosition: sources.getRow(song.sourceId)?.position ?? 0 })
      }
    }

    return rows
  }, [ids, songs, sources, sourceOrder, sorting])

  const table = useReactTable({
    data,
    columns:                songColumns,
    state:                  { sorting, globalFilter: search, columnVisibility: { source: sourceId === undefined } },
    onSortingChange:        setSorting,
    onGlobalFilterChange:   setSearch,
    globalFilterFn:         (row, _column, value: string) => songMatches(row.original, value),
    getRowId:               row => row.id,
    columnResizeMode:       'onChange',
    getCoreRowModel:        getCoreRowModel(),
    getFilteredRowModel:    getFilteredRowModel(),
    getFacetedRowModel:     getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel:      getSortedRowModel(),
  })
  const rows = table.getRowModel().rows
  // The same array until a width or the shown columns change, so a scroll does not draw the rows that stay in view.
  const sizing = table.getState().columnSizing
  const columns = useMemo(
    () => table.getVisibleLeafColumns().map(column => ({ id: column.id, width: column.getSize() })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sizing and sourceId are what change the columns
    [table, sizing, sourceId],
  )
  const scrollerRef = useRef<HTMLDivElement>(null)
  const virtual = useVirtualizer({
    count:            rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize:     () => rowHeight,
    overscan:         12,
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.key !== 'ArrowDown' && event.key !== 'ArrowUp') || event.ctrlKey || event.metaKey || event.altKey || keysBelongElsewhere(event.target)) {
        return
      }
      if (rows.length === 0) {
        return
      }
      event.preventDefault()
      const at = rows.findIndex(row => row.id === selected)
      const next = event.key === 'ArrowDown'
        ? (at === -1 ? 0 : Math.min(at + 1, rows.length - 1))
        : (at === -1 ? rows.length - 1 : Math.max(at - 1, 0))
      onSelect(rows[next].id)
      virtual.scrollToIndex(next, { align: 'auto' })
    }
    addEventListener('keydown', onKey)

    return () => {
      removeEventListener('keydown', onKey)
    }
  }, [rows, selected, onSelect, virtual])

  return (
    <Flex direction='column' flex='1' minH='0' minW='0' h='full'>
      <Box px='3' py='2' borderBottomWidth='1px'>
        <InputGroup endElement={search === '' ? undefined : <CloseButton size='2xs' aria-label='Clear the search' onClick={() => { setSearch('') }} />}>
          <Input
            size='sm'
            type='search'
            placeholder='Search the songs'
            aria-label='Search the songs'
            value={search}
            onChange={event => { setSearch(event.target.value) }}
          />
        </InputGroup>
      </Box>
      <Box ref={scrollerRef} role='table' aria-rowcount={rows.length} flex='1' overflow='auto' minH='0'>
        <Flex
          role='row'
          position='sticky'
          top='0'
          zIndex='1'
          minW='full'
          w={table.getTotalSize() + rowPadding * 2}
          style={{ paddingInline: rowPadding }}
          bg='bg'
          borderBottomWidth='1px'
          fontSize='xs'
          color='fg.muted'
          textTransform='uppercase'
        >
          {table.getHeaderGroups()[0]?.headers.map(header => {
            const sort = header.column.getIsSorted()

            return (
              <Flex
                key={header.id}
                role='columnheader'
                aria-sort={sort === 'asc' ? 'ascending' : (sort === 'desc' ? 'descending' : 'none')}
                position='relative'
                align='center'
                gap='1'
                py='1'
                pe='3'
                flexShrink={0}
                cursor='pointer'
                userSelect='none'
                style={{ width: header.getSize() }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <Text truncate>{String(header.column.columnDef.header)}</Text>
                <Text aria-hidden>{sort === 'asc' ? '▲' : (sort === 'desc' ? '▼' : '')}</Text>
                {filterColumnIds.includes(header.column.id) && (
                  <ColumnFilter
                    title={String(header.column.columnDef.header)}
                    options={optionsOf(header.column)}
                    selected={(header.column.getFilterValue() as string[] | undefined) ?? []}
                    onChange={values => {
                      header.column.setFilterValue(values.length === 0 ? undefined : values)
                    }}
                  />
                )}
                <Box
                  role='separator'
                  aria-label={`Resize ${String(header.column.columnDef.header)}`}
                  position='absolute'
                  insetEnd='0'
                  top='0'
                  h='full'
                  w='6px'
                  cursor='col-resize'
                  touchAction='none'
                  bg={header.column.getIsResizing() ? 'blue.solid' : undefined}
                  _hover={{ bg: 'border.emphasized' }}
                  onClick={event => { event.stopPropagation() }}
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                />
              </Flex>
            )
          })}
        </Flex>
        <ContextMenu entriesFor={entriesFor} onTarget={onSelect}>
          {rows.length === 0 && (
            <Text p='6' color='fg.muted' textAlign='center'>
              {ids.length === 0
                ? 'No songs yet. Add a playlist or a song and its songs show here as they are found.'
                : 'No song matches the search.'}
            </Text>
          )}
          <Box position='relative' minW='full' style={{ height: virtual.getTotalSize(), width: table.getTotalSize() + rowPadding * 2 }}>
            {virtual.getVirtualItems().map(item => (
              <SongRow
                key={rows[item.index].id}
                id={rows[item.index].id}
                songs={songs}
                top={item.start}
                height={item.size}
                selected={selected === rows[item.index].id}
                striped={item.index % 2 === 1}
                columns={columns}
                sourcePosition={rows[item.index].original.sourcePosition}
                onSelect={onSelect}
              />
            ))}
          </Box>
        </ContextMenu>
      </Box>
    </Flex>
  )
}
