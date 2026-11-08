import type { Song, Table } from '../library'

/**
 * The IDs of the songs to show, in the order of the list.
 *
 * @param all - every song ID, in order.
 * @param songs - where the songs are.
 * @param sourceId - show only the songs of this source; every song when `undefined`.
 * @returns `all` itself when nothing is left out, so a table that gets the same array draws nothing again.
 */
export function visibleIds (all: readonly string[], songs: Table<Song>, sourceId: string | undefined): readonly string[] {
  return sourceId === undefined ? all : all.filter(id => songs.getRow(id)?.sourceId === sourceId)
}
