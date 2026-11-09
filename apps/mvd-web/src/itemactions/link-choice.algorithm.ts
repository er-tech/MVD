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

/**
 * The link of a song to copy or open when the person did not choose one: the official video when one was
 * found, else the video of the playlist (the original), else whatever there is.
 *
 * @param links - the links of the song, as the Go side words them.
 * @returns the link, or `undefined` when the song has none.
 */
export function preferredLink (links: readonly DetailLink[]): DetailLink | undefined {
  return links.find(link => link.label.startsWith('Official')) ??
    links.find(link => link.label.startsWith('Video in the playlist')) ??
    links[0]
}
