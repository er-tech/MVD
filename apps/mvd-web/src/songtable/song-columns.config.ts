import type { ColumnDef } from '@tanstack/react-table'
import type { Song } from '../library'

/** The columns of the table, with their first widths in pixels. The person can change the widths, and sort by a column. */
export const songColumns: ColumnDef<Song>[] = [
  { id: 'position', accessorKey: 'position', header: '#', size: 56, minSize: 40 },
  { id: 'artist', accessorKey: 'artist', header: 'Artist', size: 220, minSize: 60 },
  { id: 'title', accessorKey: 'title', header: 'Title', size: 320, minSize: 60 },
  { id: 'status', accessorKey: 'status', header: 'Status', size: 170, minSize: 60 },
  { id: 'version', accessorKey: 'version', header: 'Version', size: 100, minSize: 60 },
  { id: 'progress', accessorKey: 'percent', header: 'Progress', size: 160, minSize: 60 },
]
