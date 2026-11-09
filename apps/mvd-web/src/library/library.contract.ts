/** One playlist, album or song link the person added. The ID is stable, so the page keeps rows by ID. */
export interface Source {
  id:       string
  url:      string
  /** The place of the source in the list, from 1. It is the number the person sees, and it changes when the source is moved. */
  position: number
  /** The name of the playlist once it is listed, the URL until then. */
  title:    string
  /** `listing`, `listed` or `failed`. */
  status:   string
  error:    string
  songs:    number
  done:     number
  failed:   number
  /** How many songs of the source are being looked up now. */
  finding:  number
}

/** The colour a status asks for. */
export type Tone = 'text' | 'dim' | 'focus' | 'highlight' | 'success' | 'error'

/** One song of a source, as the table shows it. */
export interface Song {
  id:        string
  sourceId:  string
  position:  number
  artist:    string
  title:     string
  /** The word that says where the song is: `waiting`, `finding`, `official found`... */
  status:    string
  tone:      Tone
  percent:   number
  /** Bytes a second, 0 when no download is going. */
  speed:     number
  /** `official`, `better`, `original` or `` when not known. */
  version:   string
  height:    number
  audioKbps: number
  error:     string
}

/** The phase of the run, as the footer and the toolbar show it. */
export type Phase = 'empty' | 'loading' | 'ready' | 'downloading' | 'finished'

/** The state of the run. */
export interface Run {
  phase:   Phase
  started: boolean
  paused:  boolean
  sources: number
  songs:   number
  done:    number
  failed:  number
  active:  number
  /** Bytes a second of all the downloads together. */
  speed:   number
}

/** What happened to the rows of one kind in a batch. */
export interface Changes<T> {
  upserts: T[]
  removed: string[]
}

/** The changes between two revisions. Apply it at revision R when `from <= R < to`. */
export interface Batch {
  from:    number
  to:      number
  sources: Changes<Source>
  songs:   Changes<Song>
  /** The run when it changed in the batch, `null` when it did not. */
  run:     Run | null
}

/** Every source and song, in the order they came in, at one revision. */
export interface State {
  revision: number
  sources:  Source[]
  songs:    Song[]
  run:      Run
}

/** What `LibraryStore.apply` did with a batch. */
export type ApplyResult = 'applied' | 'stale' | 'gap'
