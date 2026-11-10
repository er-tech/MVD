import type { Song, Tone } from '../library'

/** How far a song is, in one word the person can filter by. */
export type ProgressState = 'waiting' | 'downloading' | 'saved' | 'failed' | 'skipped'

/** The words of each progress state, in the order the filter lists them. */
export const progressLabels: Record<ProgressState, string> = {
  waiting:     'Waiting',
  downloading: 'Downloading',
  saved:       'Saved',
  failed:      'Failed',
  skipped:     'Skipped',
}

const savedWords = new Set(['saved', 'official', 'better', 'have it'])
const workingWords = new Set(['downloading', 'starting', 'joining'])
const skippedWords = new Set(['no official', 'rejected', 'Video unavailable'])

/**
 * How far a song is, from the word of its status and its percent.
 *
 * @param song - the song.
 */
export function progressOf (song: Pick<Song, 'status' | 'percent'>): ProgressState {
  if (song.status === 'failed') {
    return 'failed'
  }
  if (savedWords.has(song.status)) {
    return 'saved'
  }
  if (skippedWords.has(song.status)) {
    return 'skipped'
  }

  return workingWords.has(song.status) || (song.percent > 0 && song.percent < 100) ? 'downloading' : 'waiting'
}

/** The Chakra colour palette of each progress state. */
export const progressPalette: Record<ProgressState, string> = {
  waiting:     'gray',
  downloading: 'blue',
  saved:       'green',
  failed:      'red',
  skipped:     'yellow',
}

/** The Chakra colour palette of the tone of a status. */
export const tonePalette: Record<Tone, string> = {
  text:      'gray',
  dim:       'gray',
  focus:     'blue',
  highlight: 'orange',
  success:   'green',
  error:     'red',
}

/** The words and colour of a version, or `undefined` when it is not known yet. */
export function versionLook (version: string): { label: string, palette: string } | undefined {
  switch (version) {
    case 'official': { return { label: 'Official', palette: 'green' } }
    case 'better': { return { label: 'Best quality', palette: 'purple' } }
    case 'original': { return { label: 'Original', palette: 'orange' } }
    default: { return undefined }
  }
}

/** The quality of the file a song gets, like `1080p · 256 kbps`, or an empty text when it is not known. */
export function qualityOf (song: Pick<Song, 'height' | 'audioKbps'>): string {
  return [song.height > 0 ? `${String(song.height)}p` : '', song.audioKbps > 0 ? `${String(song.audioKbps)} kbps` : ''].filter(Boolean).join(' · ')
}

/**
 * The words and colour of the best audio step of a song, or `undefined` when the song has none.
 *
 * @param audio - where the step is.
 * @param kbps - the best audio rate found for the song, 0 when not known: the `ready` step shows it.
 */
export function audioLook (audio: string, kbps = 0): { label: string, palette: string } | undefined {
  switch (audio) {
    case 'waiting': { return { label: 'Waiting', palette: 'gray' } }
    case 'ready': { return { label: kbps > 0 ? `${String(kbps)} kbps` : 'Ready', palette: 'cyan' } }
    case 'fetching': { return { label: 'Fetching', palette: 'blue' } }
    case 'done': { return { label: 'On the video', palette: 'green' } }
    case 'not done': { return { label: 'Not done', palette: 'yellow' } }
    default: { return undefined }
  }
}
