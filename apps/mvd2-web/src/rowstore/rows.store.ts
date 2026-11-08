import type { ApplyResult, Batch, Row, State } from './row.contract.ts'

type Listener = () => void

/**
 * The rows the page shows, by ID. A changed row tells only the listeners of that row, so a component
 * for one row is the only one drawn again. The list of IDs is a new array only when a row is added or
 * removed, never when a row changes.
 */
export class RowsStore {
  private rows = new Map<string, Row>()
  private order: readonly string[] = []
  private current = 0
  private readonly rowListeners = new Map<string, Set<Listener>>()
  private readonly listListeners = new Set<Listener>()

  /** The row with the ID, or `undefined`. The same object is returned until the row changes. */
  getRow = (id: string): Row | undefined => this.rows.get(id)

  /** The IDs in order. The same array is returned until a row is added or removed. */
  getOrder = (): readonly string[] => this.order

  /**
   * Listen to one row.
   *
   * @returns a function that stops the listening.
   */
  subscribeRow = (id: string, listener: Listener): (() => void) => {
    let set = this.rowListeners.get(id)
    if (set === undefined) {
      set = new Set()
      this.rowListeners.set(id, set)
    }
    set.add(listener)

    return () => {
      set.delete(listener)
      if (set.size === 0) {
        this.rowListeners.delete(id)
      }
    }
  }

  /**
   * Listen to the list of IDs: it tells when a row is added or removed.
   *
   * @returns a function that stops the listening.
   */
  subscribeList = (listener: Listener): (() => void) => {
    this.listListeners.add(listener)

    return () => this.listListeners.delete(listener)
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
    const previous = this.rows
    this.rows = new Map(state.rows.map(row => [row.id, row]))
    this.order = state.rows.map(row => row.id)
    this.current = state.revision
    this.listListeners.forEach(notify)
    const ids = new Set([...previous.keys(), ...this.rows.keys()])
    for (const id of ids) {
      if (previous.get(id) !== this.rows.get(id)) {
        this.rowListeners.get(id)?.forEach(notify)
      }
    }
  }

  /**
   * Apply the changes of a batch.
   *
   * @param batch - the changes between two revisions.
   * @returns `stale` when the page already has them, `gap` when a batch was missed and the caller must
   * ask for all the rows again, `applied` otherwise.
   */
  apply (batch: Batch): ApplyResult {
    if (batch.to <= this.current) {
      return 'stale'
    }
    if (batch.from > this.current) {
      return 'gap'
    }
    const added: string[] = []
    for (const row of batch.upserts) {
      if (!this.rows.has(row.id)) {
        added.push(row.id)
      }
      this.rows.set(row.id, row)
    }
    let removedAny = false
    for (const id of batch.removed) {
      if (this.rows.delete(id)) {
        removedAny = true
      }
    }
    const membership = added.length > 0 || removedAny
    if (membership) {
      const kept = removedAny ? this.order.filter(id => this.rows.has(id)) : this.order
      this.order = [...kept, ...added]
    }
    this.current = batch.to
    if (membership) {
      this.listListeners.forEach(notify)
    }
    for (const row of batch.upserts) {
      this.rowListeners.get(row.id)?.forEach(notify)
    }
    for (const id of batch.removed) {
      this.rowListeners.get(id)?.forEach(notify)
    }

    return 'applied'
  }
}

function notify (listener: Listener): void {
  listener()
}
