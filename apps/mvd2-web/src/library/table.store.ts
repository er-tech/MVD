import type { Changes } from './library.contract.ts'

type Listener = () => void

/** True when two flat records hold the same values. */
function sameValues<T extends object> (a: T, b: T): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>

  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => left[key] === right[key])
}

function notify (listener: Listener): void {
  listener()
}

/**
 * The rows of one kind, by ID. A changed row tells only the listeners of that row, so a component
 * for one row is the only one drawn again. The list of IDs is a new array only when a row is added or
 * removed, never when a row changes. A row that is sent again with the same values keeps its object, so
 * a reload of everything draws only what really differs.
 */
export class Table<T extends { id: string }> {
  private rows = new Map<string, T>()
  private order: readonly string[] = []
  private readonly rowListeners = new Map<string, Set<Listener>>()
  private readonly listListeners = new Set<Listener>()

  /** The row with the ID, or `undefined`. The same object is returned until the row changes. */
  getRow = (id: string): T | undefined => this.rows.get(id)

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

  /**
   * Replace every row. A row with the same values as the one held is kept as it is.
   *
   * @param rows - all the rows, in order.
   */
  replace (rows: readonly T[]): void {
    const previous = this.rows
    const next = new Map<string, T>()
    for (const row of rows) {
      const held = previous.get(row.id)
      next.set(row.id, held !== undefined && sameValues(held, row) ? held : row)
    }
    const order = rows.map(row => row.id)
    const sameOrder = order.length === this.order.length && order.every((id, index) => id === this.order[index])
    this.rows = next
    if (!sameOrder) {
      this.order = order
      this.listListeners.forEach(notify)
    }
    const ids = new Set([...previous.keys(), ...next.keys()])
    for (const id of ids) {
      if (previous.get(id) !== next.get(id)) {
        this.rowListeners.get(id)?.forEach(notify)
      }
    }
  }

  /**
   * Apply the changes of one batch.
   *
   * @param changes - the rows to add or replace, in the order they were added, and the IDs to remove.
   */
  apply (changes: Changes<T>): void {
    const added: string[] = []
    for (const row of changes.upserts) {
      if (!this.rows.has(row.id)) {
        added.push(row.id)
      }
      this.rows.set(row.id, row)
    }
    let removedAny = false
    for (const id of changes.removed) {
      if (this.rows.delete(id)) {
        removedAny = true
      }
    }
    const membership = added.length > 0 || removedAny
    if (membership) {
      const kept = removedAny ? this.order.filter(id => this.rows.has(id)) : this.order
      this.order = [...kept, ...added.filter(id => this.rows.has(id))]
      this.listListeners.forEach(notify)
    }
    for (const row of changes.upserts) {
      this.rowListeners.get(row.id)?.forEach(notify)
    }
    for (const id of changes.removed) {
      this.rowListeners.get(id)?.forEach(notify)
    }
  }
}
