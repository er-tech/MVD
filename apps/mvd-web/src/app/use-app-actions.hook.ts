import { useCallback, useEffect } from 'react'
import type { Backend, MenuAction } from '../backend'
import type { Run } from '../library'
import { shortcutList } from '../shortcuts'

/** The windows the page can open. */
export type ModalName = 'add' | 'preferences' | 'about' | 'shortcuts' | 'quit' | 'replace' | 'player'

interface AppActions {
  backend:   Backend
  run:       Run
  /** True while a window of the page is open: the keys then belong to that window. */
  modalOpen: boolean
  /** Opens a window of the page. */
  open:      (modal: ModalName) => void
  /** Shows a message from a command that Go refused. */
  notify:    (message: string) => void
  /** What the Paste item of the menu does. */
  paste:     () => Promise<void>
  /** Copy the chosen source or song. */
  copyItem:  () => void
}

/** True when a key press is the shortcut written as `Ctrl+Shift+S`, `F1` and the like. */
function matches (event: KeyboardEvent, keys: string): boolean {
  const parts = keys.split('+')
  const key = parts.at(-1) ?? ''
  const wantsCtrl = parts.includes('Ctrl')
  const wantsShift = parts.includes('Shift')

  return (event.ctrlKey || event.metaKey) === wantsCtrl && event.shiftKey === wantsShift && event.altKey === parts.includes('Alt') && event.key.toLowerCase() === key.toLowerCase()
}

/**
 * Do what a menu item or a shortcut asks. The window's menu and the keyboard end in the same function,
 * so each does the same thing. A command that Go refuses puts its message in the status bar.
 *
 * @param actions.backend - the Go side.
 * @param actions.run - the state of the run, to choose between Pause and Resume.
 * @param actions.modalOpen - whether a window is open, which keeps the keys for itself.
 * @param actions.open - opens a window of the page.
 * @param actions.notify - shows a message.
 * @param actions.paste - pastes for the Paste item of the menu.
 * @param actions.copyItem - copies the chosen item, for the Copy item of the menu when no text is selected.
 */
export function useAppActions ({ backend, run, open, notify, modalOpen, paste, copyItem }: AppActions): void {
  const perform = useCallback((action: MenuAction): void => {
    const ask = async (command: () => Promise<unknown>): Promise<void> => {
      try {
        await command()
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error))
      }
    }
    switch (action) {
      case 'add': { open('add'); break }
      case 'preferences': { open('preferences'); break }
      case 'about': { open('about'); break }
      case 'shortcuts': { open('shortcuts'); break }
      case 'new-list': { void ask(backend.newList); break }
      case 'open-list': { void ask(backend.openListFile); break }
      case 'save-list': { void ask(backend.saveList); break }
      case 'save-list-as': { void ask(backend.saveListAs); break }
      // One key starts the run, and then pauses and resumes it.
      case 'start': { void ask(run.started ? (run.paused ? backend.resume : backend.pause) : backend.start); break }
      case 'pause-resume': { void ask(run.paused ? backend.resume : backend.pause); break }
      case 'undo':
      case 'redo':
      case 'cut': { document.execCommand(action); break }
      case 'copy': {
        if (globalThis.getSelection()?.toString() === '') {
          copyItem()
        } else {
          document.execCommand('copy')
        }
        break
      }
      case 'paste': { void ask(paste); break }
      case 'retry-failed': { void ask(backend.retryFailed); break }
      case 'quit': { void ask(backend.quit); break }
      case 'search-songs': {
        const field = document.querySelector<HTMLInputElement>('input[aria-label="Search the songs"]')
        field?.focus()
        field?.select()
        break
      }
      case 'open-folder': { void ask(backend.openOutputFolder); break }
    }
  }, [backend, run.paused, run.started, open, notify, paste, copyItem])

  useEffect(() => backend.onMenu(perform), [backend, perform])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (modalOpen) {
        return
      }
      const shortcut = shortcutList.find(candidate => matches(event, candidate.keys))
      if (shortcut === undefined) {
        return
      }

      event.preventDefault()
      perform(shortcut.action)
    }
    globalThis.addEventListener('keydown', onKey)

    return () => {
      globalThis.removeEventListener('keydown', onKey)
    }
  }, [perform, modalOpen])
}
