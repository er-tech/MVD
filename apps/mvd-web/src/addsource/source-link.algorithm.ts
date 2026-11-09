const sourceHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

/** True when the text is one link to a YouTube video, playlist or album, which the app can load. */
function isSourceLink (text: string): boolean {
  try {
    const link = new URL(text)

    return (link.protocol === 'https:' || link.protocol === 'http:') && sourceHosts.has(link.hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * The links in a text that the app can add: each word that is a YouTube address, once.
 *
 * @param text - what was pasted or dropped, with links separated by white space.
 * @returns the valid links in order, without repeats. A text with none gives an empty list.
 */
export function sourceLinks (text: string): string[] {
  const found = text.split(/\s+/).filter(word => isSourceLink(word))

  return [...new Set(found)]
}

/**
 * The text a drag from a browser carries: the address in `text/uri-list` when there is one, else the plain text.
 *
 * @param data - the data of the drag or the paste.
 */
export function textOf (data: Pick<DataTransfer, 'getData'>): string {
  const list = data.getData('text/uri-list').split(/\r?\n/).filter(line => line !== '' && !line.startsWith('#'))

  return list.length > 0 ? list.join('\n') : data.getData('text/plain')
}
