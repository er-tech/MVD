import { useCallback, useEffect } from 'react'
import { sourceLinks, textOf } from '../addsource'
import type { Backend } from '../backend'

interface LinkInput {
  backend: Backend
  /** False while a window of the page is open: its fields take the paste and the drops. */
  enabled: boolean
  /** Shows a message from a command that Go refused. */
  notify:  (message: string) => void
}

/** True for an element the person types in, which keeps its own paste. */
function isField (target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null)
}

const isListFile = (path: string): boolean => path.toLowerCase().endsWith('.mvd')

/**
 * Add what the person pastes or drops on the page. A .mvd file dropped opens as the list; a link
 * dropped from a browser or pasted outside a field goes in as a source when it is a YouTube address.
 *
 * @param input.backend - the Go side.
 * @param input.enabled - whether the page takes the input, which is not so while a window is open.
 * @param input.notify - shows a message.
 * @returns `paste`, which does what the Paste item of the menu asks: it pastes into the field in focus, or adds the links.
 */
export function useLinkInput ({ backend, enabled, notify }: LinkInput): { paste: () => Promise<void> } {
  const addLinks = useCallback(async (text: string): Promise<boolean> => {
    const links = sourceLinks(text)
    if (links.length === 0) {
      return false
    }
    const refused: string[] = []
    for (const link of links) {
      try {
        await backend.addSource(link)
      } catch (error) {
        refused.push(`${link}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    notify(refused.length === 0 ? `Added ${String(links.length)} ${links.length === 1 ? 'link' : 'links'}` : refused.join('; '))

    return true
  }, [backend, notify])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const onPaste = (event: ClipboardEvent): void => {
      if (isField(event.target) || event.clipboardData === null) {
        return
      }
      const text = event.clipboardData.getData('text/plain')
      if (sourceLinks(text).length === 0) {
        return
      }
      event.preventDefault()
      void addLinks(text)
    }
    const carriesText = (event: DragEvent): boolean => {
      const types = event.dataTransfer?.types ?? []

      return types.includes('text/uri-list') || types.includes('text/plain')
    }
    const onDragOver = (event: DragEvent): void => {
      if (carriesText(event)) {
        event.preventDefault()
      }
    }
    const onDrop = (event: DragEvent): void => {
      if (!carriesText(event) || event.dataTransfer === null) {
        return
      }
      event.preventDefault()
      const text = textOf(event.dataTransfer)
      if (sourceLinks(text).length === 0) {
        notify('That is not a YouTube link.')

        return
      }
      void addLinks(text)
    }
    globalThis.addEventListener('paste', onPaste)
    globalThis.addEventListener('dragover', onDragOver)
    globalThis.addEventListener('drop', onDrop)

    return () => {
      globalThis.removeEventListener('paste', onPaste)
      globalThis.removeEventListener('dragover', onDragOver)
      globalThis.removeEventListener('drop', onDrop)
    }
  }, [addLinks, enabled, notify])

  useEffect(() => backend.onFileDrop(paths => {
    if (!enabled) {
      return
    }
    const list = paths.find(path => isListFile(path))
    if (list === undefined) {
      notify('Drop a .mvd list to open it, or a YouTube link to add it.')

      return
    }
    const open = async (): Promise<void> => {
      try {
        await backend.openListPath(list)
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error))
      }
    }
    void open()
  }), [backend, enabled, notify])

  const paste = useCallback(async (): Promise<void> => {
    const text = await navigator.clipboard.readText()
    if (isField(document.activeElement)) {
      document.execCommand('insertText', false, text)
    } else if (!await addLinks(text)) {
      notify('There is no YouTube link on the clipboard.')
    }
  }, [addLinks, notify])

  return { paste }
}
