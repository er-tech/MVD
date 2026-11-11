const idPattern = /^[\w-]{11}$/

/**
 * The ID of the YouTube video an address points to.
 *
 * @param address - a watch, short, embed or youtu.be address.
 * @returns the 11 character ID, or `undefined` when the address is not one of a video.
 */
export function videoIdOf (address: string): string | undefined {
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return undefined
  }
  const host = url.hostname.replace(/^(?:www|m|music)\./, '')
  let id: string | null | undefined
  if (host === 'youtu.be') {
    id = url.pathname.split('/', 2)[1]
  } else if (host === 'youtube.com') {
    const [, kind, second] = url.pathname.split('/', 3)
    id = kind === 'watch' ? url.searchParams.get('v') : (kind === 'shorts' || kind === 'embed' ? second : undefined)
  }

  return id !== undefined && id !== null && idPattern.test(id) ? id : undefined
}
