import { useEffect } from 'react'
import type { Selection } from '../details'
import { isField } from './editable-target.algorithm.ts'

interface ItemKeys {
  /** The source or song the person chose, `undefined` for none. */
  selection: Selection | undefined
  /** False while a window of the page is open: its fields and buttons take the keys. */
  enabled:   boolean
  /** Copy the chosen item. */
  copy:      (selection: Selection) => void
  /** Open the link of the chosen item. */
  open:      (selection: Selection) => void
  /** Take the chosen source out of the list. */
  remove:    (id: string) => void
}

/**
 * The keys of the chosen item: Ctrl+C copies its link, Enter opens it and Delete takes a source out. The keys
 * are left alone when the person is in a field, a button or a window, and Ctrl+C is left alone when some text is
 * selected, so a normal copy still works.
 *
 * @param keys - see {@link ItemKeys}.
 */
export function useItemKeys ({ selection, enabled, copy, open, remove }: ItemKeys): void {
  useEffect(() => {
    if (!enabled || selection === undefined) {
      return
    }
    const onKey = (event: KeyboardEvent): void => {
      if (isField(event.target) || (event.target instanceof HTMLElement && event.target.closest('button') !== null)) {
        return
      }
      const plain = !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'c') {
        if (globalThis.getSelection()?.toString() === '') {
          event.preventDefault()
          copy(selection)
        }
      } else if (plain && event.key === 'Enter') {
        event.preventDefault()
        open(selection)
      } else if (plain && event.key === 'Delete' && selection.kind === 'source') {
        event.preventDefault()
        remove(selection.id)
      }
    }
    globalThis.addEventListener('keydown', onKey)

    return () => {
      globalThis.removeEventListener('keydown', onKey)
    }
  }, [selection, enabled, copy, open, remove])
}
