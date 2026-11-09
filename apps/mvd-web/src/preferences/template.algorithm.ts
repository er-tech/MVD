/** A block of the file name: a field of the song that cannot be changed. */
export interface BlockSegment {
  kind:  'block'
  /** The yt-dlp field, as written in the template. */
  token: string
  /** What the block says. */
  label: string
}

/** Text the person typed between the blocks. */
export interface TextSegment {
  kind: 'text'
  text: string
}

/** One piece of the file name pattern. */
export type Segment = BlockSegment | TextSegment

/** A block the person can add to the pattern. */
export interface TemplateBlock {
  label: string
  token: string
}

/** The blocks the person can add to the file name pattern, with their yt-dlp fields. */
export const templateBlocks: TemplateBlock[] = [
  { label: 'ARTIST', token: '%(artist,uploader)s' },
  { label: 'TITLE', token: '%(title)s' },
  { label: 'PLAYLIST NAME', token: '%(playlist_title,playlist)s' },
  { label: 'PLAYLIST MUSIC INDEX', token: '%(playlist_index)02d' },
]

/** The extension ends every template: it is not the person's to move or take away. */
export const extensionSuffix = '.%(ext)s'

const tokenPattern = /%\(([^)]*)\)(0?)(\d*)([sd])/g

/** The song the example name is made from. */
const exampleSong: Record<string, string> = {
  title:          'Part Time Lover',
  artist:         'Double You',
  uploader:       'Double You',
  playlist_title: "Dance 90's",
  playlist:       "Dance 90's",
  playlist_index: '10',
  id:             'dQw4w9WgXcQ',
}

function labelOf (token: string): string {
  const known = templateBlocks.find(block => block.token === token)
  if (known) return known.label
  const first = /%\(([^)]*)\)/.exec(token)?.[1]?.split(',', 1)[0]?.trim() ?? token

  return first.replaceAll('_', ' ').toUpperCase()
}

/**
 * Split a yt-dlp output template into blocks and text, without its extension.
 *
 * @param template - the template as it is kept, for example `%(artist,uploader)s - %(title)s.%(ext)s`.
 * @returns the pieces in order. Text between two blocks is one piece.
 */
export function parseTemplate (template: string): Segment[] {
  const rest = template.endsWith(extensionSuffix) ? template.slice(0, -extensionSuffix.length) : template
  const segments: Segment[] = []
  let at = 0
  for (const match of rest.matchAll(tokenPattern)) {
    if (match.index > at) segments.push({ kind: 'text', text: rest.slice(at, match.index) })
    segments.push({ kind: 'block', token: match[0], label: labelOf(match[0]) })
    at = match.index + match[0].length
  }
  if (at < rest.length) segments.push({ kind: 'text', text: rest.slice(at) })

  return segments
}

/**
 * The yt-dlp template the pieces make, ending with the extension.
 *
 * @param segments - the pieces in order.
 */
export function formatTemplate (segments: Segment[]): string {
  return segments.map(segment => segment.kind === 'block' ? segment.token : segment.text).join('') + extensionSuffix
}

/**
 * Take piece `from` out and put it where the boundary `to` is. Boundaries are counted before the
 * piece is taken out: boundary 0 is before the first piece and boundary `length` after the last.
 *
 * @returns the pieces after the move, or the same pieces when the move changes nothing.
 */
export function moveSegment (segments: Segment[], from: number, to: number): Segment[] {
  if (to === from || to === from + 1 || from < 0 || from >= segments.length || to < 0 || to > segments.length) return segments
  const rest = segments.filter((_, index) => index !== from)

  return [...rest.slice(0, to > from ? to - 1 : to), segments[from], ...rest.slice(to > from ? to - 1 : to)]
}

/**
 * Put a piece in at the boundary `at`: 0 is before the first piece and `length` after the last.
 *
 * @returns the pieces with the new one in, the boundary held between 0 and `length`.
 */
export function insertSegment (segments: Segment[], segment: Segment, at: number): Segment[] {
  const where = Math.max(0, Math.min(at, segments.length))

  return [...segments.slice(0, where), segment, ...segments.slice(where)]
}

/**
 * The boundary of the pattern that a pointer is nearest to, going by where the pieces are.
 *
 * @param x - the pointer's horizontal position.
 * @param middles - the horizontal middle of each piece, left to right.
 * @returns the number of pieces whose middle is left of the pointer.
 */
export function boundaryAtX (x: number, middles: number[]): number {
  return middles.filter(middle => middle < x).length
}

/**
 * Take piece `index` out.
 *
 * @returns the pieces without it, or the same pieces when there is no such piece.
 */
export function removeSegment (segments: Segment[], index: number): Segment[] {
  return index < 0 || index >= segments.length ? segments : segments.filter((_, at) => at !== index)
}

/**
 * What a file would be called by a template, for a sample song, so the person sees the effect.
 * A field with alternatives (`a,b`) takes the first one the sample has, and one it has none of reads `NA`.
 *
 * @param template - the yt-dlp template.
 * @param ext - the extension to show, for example `mp4`.
 */
export function exampleName (template: string, ext: string): string {
  return template.replaceAll(tokenPattern, (_token, names: string, zero: string, width: string, kind: string) => {
    let value = 'NA'
    for (const raw of names.split(',')) {
      const name = raw.trim()
      if (name === 'ext') {
        value = ext
        break
      }
      const sample = exampleSong[name]
      if (sample !== undefined) {
        value = sample
        break
      }
    }
    if (kind === 'd' && zero === '0' && value.length < Number(width)) value = value.padStart(Number(width), '0')

    return value
  })
}
