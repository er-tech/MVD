import type { Batch, State } from '../rowstore'

/** What the page needs from the Go side. Wails supplies it in the app, a fake in a test. */
export interface Backend {
  /** All the rows and their revision. */
  getState: () => Promise<State>
  /**
   * Listen to the batches of changes.
   *
   * @returns a function that stops the listening.
   */
  onRows:   (listener: (batch: Batch) => void) => () => void
  /** Record a measure of the page in the Go side's log, when it keeps one. */
  metric:   (name: string, value: number) => void
}
