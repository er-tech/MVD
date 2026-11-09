import { useEffect } from 'react'
import type { Selection } from '../details'
import type { SongPick } from '../itemactions'
import { isField } from './editable-target.algorithm.ts'

interface ItemKeys {
  /** The source or song the person chose, `undefined` for none. */
  selection: Selection | undefined
  /** False while a window of the page is open: its fields and buttons take the keys. */
  enabled:   boolean
  /** Copy the chosen item; `pick` is which video of a song. */
  copy:      (selection: Selection, pick: SongPick) => void
  /** Open the link of the chosen item; `pick` is which video of a song. */
  open:      (selection: Selection, pick: SongPick) => void
  /** Take the chosen source out of the list. */
  remove:    (id: string) => void
}

/** Which video a Ctrl+C asks for: with Shift the original, with Alt the best audio, with both the details. */
function copyPick (event: KeyboardEvent): SongPick {
  if (event.altKey) {
    return event.shiftKey ? 'details' : 'best-audio'
  }

  return event.shiftKey ? 'original' : 'official'
}

/** Which video an Enter asks for: with Shift the original, with Ctrl and Alt the best audio, none otherwise. */
function openPick (event: KeyboardEvent): SongPick | undefined {
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.altKey && !event.shiftKey) {
    return 'best-audio'
  }
  if (mod || event.altKey) {
    return undefined
  }

  return event.shiftKey ? 'original' : 'official'
}

/**
 * The keys of the chosen item. Ctrl+C copies its link and Enter opens it: for a song the official video, with
 * Shift the original and with Alt the best audio (Ctrl+Alt+Enter to open), and Ctrl+Alt+Shift+C copies its
 * details. Delete takes a source out. The keys are left alone when the person is in a field, a button or a
 * window, and a plain Ctrl+C is left alone when some text is selected, so a normal copy still works.
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
      const mod = event.ctrlKey || event.metaKey
      const song = selection.kind === 'song'
      const plain = !(mod || event.shiftKey || event.altKey)
      if (mod && event.key.toLowerCase() === 'c') {
        const pick = copyPick(event)
        if (pick === 'official' ? globalThis.getSelection()?.toString() === '' : song) {
          event.preventDefault()
          copy(selection, pick)
        }
      } else if (event.key === 'Enter') {
        const pick = openPick(event)
        const allowed = song || pick === 'official'
        if (pick !== undefined && allowed) {
          event.preventDefault()
          open(selection, pick)
        }
      } else if (!song && plain && event.key === 'Delete') {
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
