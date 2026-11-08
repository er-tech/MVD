import type { Backend } from '../backend'
import type { Batch, LibraryStore } from '../library'

/**
 * Keep the store the same as the Go side. It listens first, then asks for everything, so no batch is
 * lost between the two. A batch that arrives before the state is queued. A batch that skips a
 * revision starts the whole load again, so the page never shows a list that is not a real state.
 *
 * @param backend - the Go side.
 * @param store - the library to keep.
 * @returns a function that stops the sync.
 */
export function connectLibrary (backend: Backend, store: LibraryStore): () => void {
  let stopped = false
  let loading = false
  let queue: Batch[] = []

  const load = async (): Promise<void> => {
    loading = true
    queue = []
    const state = await backend.getState()
    if (stopped) {
      return
    }
    store.replace(state)
    loading = false
    const waiting = queue
    queue = []
    for (const batch of waiting) {
      receive(batch)
    }
  }

  const receive = (batch: Batch): void => {
    if (stopped) {
      return
    }
    if (loading) {
      queue.push(batch)

      return
    }
    if (store.apply(batch) === 'gap') {
      void load()
    }
  }

  const stopListening = backend.onBatch(receive)
  void load()

  return () => {
    stopped = true
    stopListening()
  }
}
