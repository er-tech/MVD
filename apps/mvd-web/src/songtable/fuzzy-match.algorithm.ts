import { rankItem } from '@tanstack/match-sorter-utils'
import type { Song } from '../library'

/**
 * Whether a song matches what the person typed in the search field. The match is fuzzy: the letters
 * must come in order, but may have others between them, and case does not matter.
 *
 * @param song - the song.
 * @param query - the text typed; an empty text matches every song.
 */
export function songMatches (song: Song, query: string): boolean {
  return query.trim() === '' || rankItem(`${song.artist} ${song.title} ${song.status} ${song.version}`, query.trim()).passed
}
