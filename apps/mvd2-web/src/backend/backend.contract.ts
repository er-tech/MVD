import type { Batch, State } from '../library'
import type { Detail, ListInfo, MenuAction, PreferenceOptions, Preferences, Tools } from './wire.contract.ts'

/**
 * What the page needs from the Go side. Wails supplies it in the app, a fake in a test.
 *
 * A method that can fail rejects with an `Error` whose message is written for the person to read.
 */
export interface Backend {
  /** Every source and song and their revision. */
  getState:  () => Promise<State>
  /**
   * Listen to the batches of changes.
   *
   * @returns a function that stops the listening.
   */
  onBatch:   (listener: (batch: Batch) => void) => () => void
  /** All there is to know about a source or a song. */
  getDetail: (kind: 'source' | 'song', id: string) => Promise<Detail>

  /** Put a link in the list and start to load it. */
  addSource:    (url: string) => Promise<void>
  removeSource: (id: string) => Promise<void>
  /** Download what is ready, and each song that becomes ready later. */
  start:        () => Promise<void>
  pause:        () => Promise<void>
  resume:       () => Promise<void>
  /** Queue the failed songs again and say how many. */
  retryFailed:  () => Promise<number>

  newList:         () => Promise<void>
  /** Ask for a file and open it. Resolves with the path, `` when the person cancelled. */
  openListFile:    () => Promise<string>
  openListPath:    (path: string) => Promise<void>
  saveList:        () => Promise<void>
  /** Ask where to save. Resolves with the path, `` when the person cancelled. */
  saveListAs:      () => Promise<string>
  /** The file of the list, `` while it has none. */
  listPath:        () => Promise<string>
  /** The list the last run left, `null` when there is none. */
  recovery:        () => Promise<ListInfo | null>
  discardRecovery: () => Promise<void>

  getPreferences:       () => Promise<Preferences>
  getPreferenceOptions: () => Promise<PreferenceOptions>
  setPreferences:       (preferences: Preferences) => Promise<void>
  /** Ask for a folder. Resolves with the path, `` when the person cancelled. */
  pickOutputFolder:     () => Promise<string>

  getTools:         () => Promise<Tools>
  version:          () => Promise<string>
  openLink:         (url: string) => Promise<void>
  openOutputFolder: () => Promise<void>
  quit:             () => Promise<void>
  /** Close the window for good, after the person answered the question of `onCloseRequested`. */
  confirmQuit:      () => Promise<void>

  /** Listen to the menu of the window. */
  onMenu:           (listener: (action: MenuAction) => void) => () => void
  /** Listen to the window asking to close while downloads run: the page asks the person first. */
  onCloseRequested: (listener: () => void) => () => void

  /** Record a measure of the page in the Go side's log, when it keeps one. */
  metric: (name: string, value: number) => void
}
