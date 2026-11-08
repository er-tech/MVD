import { useEffect, useState } from 'react'
import type { Backend, Detail } from '../backend'
import type { LibraryStore } from '../library'
import type { Selection } from './selection.contract.ts'

/** The most often the details of one item are asked again while it changes, in milliseconds. */
const refreshEvery = 300

/** What the panel shows: the details, or why there are none. */
export interface DetailState {
  detail?: Detail
  /** Set when the item is gone or the Go side could not say. */
  error?:  string
}

/**
 * The details of the selected item. They are asked for when the selection changes, and again, at most
 * every 300 ms, while the item itself changes, so the panel follows a download without asking for each
 * tick. An answer for an item that is no longer selected is dropped.
 *
 * @param backend - the Go side.
 * @param store - the library, to hear when the selected row changes.
 * @param selection - the chosen item, `undefined` for none.
 * @returns the details or the error, and nothing while the first answer is awaited.
 */
export function useDetail (backend: Backend, store: LibraryStore, selection: Selection | undefined): DetailState {
  const [state, setState] = useState<DetailState>({})
  const kind = selection?.kind
  const id = selection?.id

  useEffect(() => {
    setState({})
    if (kind === undefined || id === undefined) {
      return
    }
    let current = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastAsked = 0
    const ask = async (): Promise<void> => {
      timer = undefined
      lastAsked = Date.now()
      try {
        const detail = await backend.getDetail(kind, id)
        if (current) {
          setState({ detail })
        }
      } catch (error) {
        if (current) {
          setState({ error: error instanceof Error ? error.message : String(error) })
        }
      }
    }
    const changed = (): void => {
      if (timer !== undefined) {
        return
      }
      timer = setTimeout(() => {
        void ask()
      }, Math.max(0, refreshEvery - (Date.now() - lastAsked)))
    }
    const table = kind === 'source' ? store.sources : store.songs
    const stop = table.subscribeRow(id, changed)
    void ask()

    return () => {
      current = false
      stop()
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }, [backend, store, kind, id])

  return state
}
