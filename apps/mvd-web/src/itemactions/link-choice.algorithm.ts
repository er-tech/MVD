import type { DetailLink } from '../backend'

/** True when the text is a web address, which can be opened. */
export function isAddress (text: string): boolean {
  try {
    const { protocol } = new URL(text)

    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/** Which video of a song a link is, or what to take from the song instead of a link. */
export type SongPick = 'official' | 'original' | 'best-audio' | 'details'

const labelStarts: Record<'official' | 'original' | 'best-audio', readonly string[]> = {
  'official':   ['Official'],
  'original':   ['Video in the playlist', 'Original'],
  'best-audio': ['Best audio'],
}

/**
 * The link of a song for one kind of video. The label is how the Go side words the link; the official video
 * that is also the one in the playlist counts as both the official and the original.
 *
 * @param links - the links of the song.
 * @param pick - the kind of video.
 * @returns the link, or `undefined` when the song has none of that kind.
 */
export function linkOf (links: readonly DetailLink[], pick: 'official' | 'original' | 'best-audio'): DetailLink | undefined {
  return links.find(link => labelStarts[pick].some(start => link.label.startsWith(start)) ||
    (pick === 'original' && link.label.includes('the one in the playlist')))
}
