import type { ApplyResult, Batch, Run, Song, Source, State } from './library.contract.ts'
import { Table } from './table.store.ts'

const emptyRun: Run = {
  phase: 'empty', started: false, paused: false, sources: 0, songs: 0, done: 0, failed: 0, active: 0, speed: 0,
}

/**
 * Everything the page shows: the sources, the songs and the state of the run, at one revision of the
 * Go side. The page never changes it by itself; it only follows batches from Go.
 */
export class LibraryStore {
  private run: Run = emptyRun
  private current = 0
  private readonly runListeners = new Set<() => void>()

  /** The sources, by ID. */
  readonly sources = new Table<Source>()
  /** The songs, by ID. */
  readonly songs = new Table<Song>()

  /** The state of the run. The same object is returned until the run changes. */
  getRun = (): Run => this.run

  /**
   * Listen to the run.
   *
   * @returns a function that stops the listening.
   */
  subscribeRun = (listener: () => void): (() => void) => {
    this.runListeners.add(listener)

    return () => this.runListeners.delete(listener)
  }

  private setRun (run: Run): void {
    if (Object.entries(run).every(([key, value]) => (this.run as unknown as Record<string, unknown>)[key] === value)) {
      return
    }
    this.run = run
    this.runListeners.forEach(listener => {
      listener()
    })
  }

  /** The revision of the newest change applied. */
  get revision (): number {
    return this.current
  }

  /**
   * Replace everything with a state from the Go side.
   *
   * @param state - all the rows and the revision they are at.
   */
  replace (state: State): void {
    this.sources.replace(state.sources)
    this.songs.replace(state.songs)
    this.setRun(state.run)
    this.current = state.revision
  }

  /**
   * Apply the changes of a batch.
   *
   * @param batch - the changes between two revisions.
   * @returns `stale` when the page already has them, `gap` when a batch was missed and the caller must
   * ask for everything again, `applied` otherwise.
   */
  apply (batch: Batch): ApplyResult {
    if (batch.to <= this.current) {
      return 'stale'
    }
    if (batch.from > this.current) {
      return 'gap'
    }
    this.sources.apply(batch.sources)
    this.songs.apply(batch.songs)
    if (batch.run !== null) {
      this.setRun(batch.run)
    }
    this.current = batch.to

    return 'applied'
  }
}
