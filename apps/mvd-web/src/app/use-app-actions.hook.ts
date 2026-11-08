import { useCallback, useEffect } from 'react'
import type { Backend, MenuAction } from '../backend'
import type { Run } from '../library'
import { shortcutList } from '../shortcuts'

/** The windows the page can open. */
export type ModalName = 'add' | 'preferences' | 'about' | 'shortcuts' | 'quit'

interface AppActions {
  backend:   Backend
  run:       Run
  /** True while a window of the page is open: the keys then belong to that window. */
  modalOpen: boolean
  /** Opens a window of the page. */
  open:      (modal: ModalName) => void
  /** Shows a message from a command that Go refused. */
  notify:    (message: string) => void
}

/** True when a key press is the shortcut written as `Ctrl+Shift+S`, `F1` and the like. */
function matches (event: KeyboardEvent, keys: string): boolean {
  const parts = keys.split('+')
  const key = parts.at(-1) ?? ''
  const wantsCtrl = parts.includes('Ctrl')
  const wantsShift = parts.includes('Shift')

  return (event.ctrlKey || event.metaKey) === wantsCtrl && event.shiftKey === wantsShift && event.key.toLowerCase() === key.toLowerCase()
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
 */
export function useAppActions ({ backend, run, open, notify, modalOpen }: AppActions): void {
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
      case 'start': { void ask(backend.start); break }
      case 'pause-resume': { void ask(run.paused ? backend.resume : backend.pause); break }
      case 'retry-failed': { void ask(backend.retryFailed); break }
      case 'quit': { void ask(backend.quit); break }
      case 'open-folder': { void ask(backend.openOutputFolder); break }
    }
  }, [backend, run.paused, open, notify])

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
