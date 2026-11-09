import type { Backend, DetailLink } from '../backend'
import type { MenuEntry } from '../contextmenu'
import type { LibraryStore } from '../library'
import { isAddress, preferredLink } from './link-choice.algorithm.ts'

/** What the actions on a source or a song need. */
export interface ItemActionDeps {
  backend: Backend
  store:   LibraryStore
  /** Shows a short message to the person. */
  notify:  (message: string) => void
  /** Takes a source out of the list. */
  remove:  (id: string) => void
}

/** The kind of item an action is for. */
export type ItemKind = 'source' | 'song'

async function linksOf (deps: ItemActionDeps, id: string): Promise<DetailLink[]> {
  const detail = await deps.backend.getDetail('song', id)

  return detail.links
}

/**
 * The text to copy for an item. A source gives its address, or what the person wrote when it is not one. A song
 * gives its official video, else its original, else its artist and title with a comma between.
 *
 * @returns the text, or `undefined` when the item is gone.
 */
export async function copyTextOf (deps: ItemActionDeps, kind: ItemKind, id: string): Promise<string | undefined> {
  if (kind === 'source') {
    return deps.store.sources.getRow(id)?.url
  }
  const song = deps.store.songs.getRow(id)

  return song === undefined ? undefined : preferredLink(await linksOf(deps, id))?.url ?? `${song.artist}, ${song.title}`
}

/** The address to open for an item, or `undefined` when it has none. */
export async function openTargetOf (deps: ItemActionDeps, kind: ItemKind, id: string): Promise<string | undefined> {
  if (kind === 'source') {
    const url = deps.store.sources.getRow(id)?.url

    return url !== undefined && isAddress(url) ? url : undefined
  }

  return preferredLink(await linksOf(deps, id))?.url
}

/** Put a text on the clipboard and say so. */
async function copyText (deps: ItemActionDeps, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    deps.notify(`Copied ${text}`)
  } catch (error) {
    deps.notify(error instanceof Error ? error.message : String(error))
  }
}

/** Copy the text of an item to the clipboard and say so. */
export async function copyItem (deps: ItemActionDeps, kind: ItemKind, id: string): Promise<void> {
  const text = await copyTextOf(deps, kind, id)
  if (text !== undefined) {
    await copyText(deps, text)
  }
}

/** Open the address of an item in the browser; say so when there is none. */
export async function openItem (deps: ItemActionDeps, kind: ItemKind, id: string): Promise<void> {
  const url = await openTargetOf(deps, kind, id)
  if (url === undefined) {
    deps.notify('There is no link to open.')

    return
  }
  try {
    await deps.backend.openLink(url)
  } catch (error) {
    deps.notify(error instanceof Error ? error.message : String(error))
  }
}

const run = (action: Promise<void>): void => {
  void action
}

/**
 * The entries of the right-click menu of an item. A source offers Copy, Open (when its text is an address) and Delete.
 * A song offers Copy and Open for the link it prefers, then the same for each link it has (the original, the
 * official video and so on), and its artist and title to copy.
 */
export async function menuEntriesOf (deps: ItemActionDeps, kind: ItemKind, id: string): Promise<MenuEntry[]> {
  if (kind === 'source') {
    const url = deps.store.sources.getRow(id)?.url ?? ''

    return [
      { key: 'copy', label: 'Copy', shortcut: 'Ctrl+C', run: () => { run(copyItem(deps, kind, id)) } },
      { key: 'open', label: 'Open', shortcut: 'Enter', disabled: !isAddress(url), run: () => { run(openItem(deps, kind, id)) } },
      { key: 'delete', label: 'Delete', shortcut: 'Delete', separatorBefore: true, run: () => { deps.remove(id) } },
    ]
  }
  const song = deps.store.songs.getRow(id)
  const links = await linksOf(deps, id)
  const chosen = preferredLink(links)
  const copyLink = (link: DetailLink) => () => {
    run(copyText(deps, link.url))
  }
  const entries: MenuEntry[] = [
    { key: 'copy', label: 'Copy', shortcut: 'Ctrl+C', run: () => { run(copyItem(deps, kind, id)) } },
    { key: 'open', label: 'Open', shortcut: 'Enter', disabled: chosen === undefined, run: () => { run(openItem(deps, kind, id)) } },
  ]
  for (const [index, link] of links.entries()) {
    entries.push(
      { key: `copy-${String(index)}`, label: `Copy: ${link.label}`, separatorBefore: index === 0, run: copyLink(link) },
      { key: `open-${String(index)}`, label: `Open: ${link.label}`, run: () => { run(deps.backend.openLink(link.url)) } },
    )
  }
  if (song !== undefined) {
    const name = `${song.artist}, ${song.title}`
    entries.push({
      key:             'copy-name',
      label:           'Copy: artist and title',
      separatorBefore: true,
      run:             () => { run(copyText(deps, name)) },
    })
  }

  return entries
}
