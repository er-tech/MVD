/** One song as the Go side sends it. The ID is stable, so the page keeps rows by ID. */
export interface Row {
  id:      string
  artist:  string
  title:   string
  status:  string
  percent: number
}

/** The changes between two revisions. Apply it at revision R when `from <= R < to`. */
export interface Batch {
  from:    number
  to:      number
  upserts: Row[]
  removed: string[]
}

/** All the rows, in the order they came in, at one revision. */
export interface State {
  revision: number
  rows:     Row[]
}

/** What `RowsStore.apply` did with a batch. */
export type ApplyResult = 'applied' | 'stale' | 'gap'
