import type { ColumnDef } from '@tanstack/react-table'
import type { Song } from '../library'
import { progressOf } from '../songtags'

/** A song as a row of the table: the song and the place of its source in the list. */
export type SongLine = Song & { sourcePosition: number }

/** The columns of the table, with their first widths in pixels. The person can change the widths, and sort by a column. */
export const songColumns: ColumnDef<SongLine>[] = [
  { id: 'source', accessorKey: 'sourcePosition', header: 'Source #', size: 84, minSize: 50 },
  { id: 'position', accessorKey: 'position', header: '#', size: 56, minSize: 40 },
  { id: 'artist', accessorKey: 'artist', header: 'Artist', size: 220, minSize: 60 },
  { id: 'title', accessorKey: 'title', header: 'Title', size: 320, minSize: 60 },
  { id: 'status', accessorKey: 'status', header: 'Status', size: 190, minSize: 60, filterFn: 'arrIncludesSome' },
  { id: 'version', accessorKey: 'version', header: 'Version', size: 130, minSize: 60, filterFn: 'arrIncludesSome' },
  { id: 'audio', accessorKey: 'audio', header: 'Best audio', size: 130, minSize: 60, filterFn: 'arrIncludesSome' },
  {
    id:         'progress',
    accessorFn: song => progressOf(song),
    header:     'Progress',
    size:       160,
    minSize:    60,
    filterFn:   'arrIncludesSome',
    sortingFn:  (a, b) => a.original.percent - b.original.percent,
  },
]

/** The columns that have a filter in their header. */
export const filterColumnIds: readonly string[] = ['status', 'version', 'audio', 'progress']

/** The space left of the first column, in pixels. */
export const rowPadding = 12

/** One column as the rows draw it: its id and width in pixels. */
export interface SongColumn {
  id:    string
  width: number
}
