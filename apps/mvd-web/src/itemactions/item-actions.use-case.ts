import type { Backend, DetailLink } from '../backend'
import type { MenuEntry } from '../contextmenu'
import type { LibraryStore } from '../library'
import { isAddress, linkOf } from './link-choice.algorithm.ts'
import type { SongPick } from './link-choice.algorithm.ts'

/** What the actions on a source or a song need. */
export interface ItemActionDeps {
  backend: Backend
  store:   LibraryStore
  /** Shows a short message to the person. */
  notify:  (message: string) => void
  /** Takes a source out of the list. */
  remove:  (id: string) => void
  /** Opens the window that gives a song another video. */
  replace: (id: string) => void
}

/** The kind of item an action is for. */
export type ItemKind = 'source' | 'song'

async function linksOf (deps: ItemActionDeps, id: string): Promise<DetailLink[]> {
  const detail = await deps.backend.getDetail('song', id)

  return detail.links
}

/** What a song gives: `official` when none is asked. A source gives its address whatever is asked. */
async function songTarget (deps: ItemActionDeps, id: string, pick: SongPick): Promise<{ text?: string, url?: string }> {
  const song = deps.store.songs.getRow(id)
  if (song === undefined) {
    return {}
  }
  if (pick === 'details') {
    return { text: `${song.artist}, ${song.title}` }
  }
  const url = linkOf(await linksOf(deps, id), pick)?.url

  return { text: url, url }
}

/**
 * The text to copy for an item. A source gives its address, or what the person wrote when it is not one. A song
 * gives the address of the kind of video asked for, or its artist and title.
 *
 * @param pick - which video of a song, the official one when not given.
 * @returns the text, or `undefined` when the item is gone or the song has no such video.
 */
export async function copyTextOf (deps: ItemActionDeps, kind: ItemKind, id: string, pick: SongPick = 'official'): Promise<string | undefined> {
  if (kind === 'source') {
    return deps.store.sources.getRow(id)?.url
  }
  const target = await songTarget(deps, id, pick)

  return target.text
}

/** The address to open for an item, or `undefined` when it has none. */
export async function openTargetOf (deps: ItemActionDeps, kind: ItemKind, id: string, pick: SongPick = 'official'): Promise<string | undefined> {
  if (kind === 'source') {
    const url = deps.store.sources.getRow(id)?.url

    return url !== undefined && isAddress(url) ? url : undefined
  }

  const target = await songTarget(deps, id, pick)

  return pick === 'details' ? undefined : target.url
}

const missing: Record<SongPick, string> = {
  'official':   'There is no official video to use.',
  'original':   'There is no original video to use.',
  'best-audio': 'There is no best audio to use.',
  'details':    'There is nothing to copy.',
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

/** Copy the text of an item to the clipboard and say so; say so too when the song has no such video. */
export async function copyItem (deps: ItemActionDeps, kind: ItemKind, id: string, pick: SongPick = 'official'): Promise<void> {
  const text = await copyTextOf(deps, kind, id, pick)
  if (text !== undefined) {
    await copyText(deps, text)
  } else if (kind === 'song') {
    deps.notify(missing[pick])
  }
}

/** Open the address of an item in the browser; say so when there is none. */
export async function openItem (deps: ItemActionDeps, kind: ItemKind, id: string, pick: SongPick = 'official'): Promise<void> {
  const url = await openTargetOf(deps, kind, id, pick)
  if (url === undefined) {
    deps.notify(kind === 'song' ? missing[pick] : 'There is no link to open.')

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

/** The pairs of a song menu: what each does, the words of the video, the keys to copy and the keys to open. */
const songGroups: readonly { pick: SongPick, name: string, copyKeys: string, openKeys?: string }[] = [
  { pick: 'official', name: 'official', copyKeys: 'Ctrl+C', openKeys: 'Enter' },
  { pick: 'original', name: 'original', copyKeys: 'Ctrl+Shift+C', openKeys: 'Shift+Enter' },
  { pick: 'best-audio', name: 'best audio', copyKeys: 'Ctrl+Alt+C', openKeys: 'Ctrl+Alt+Enter' },
  { pick: 'details', name: 'song details', copyKeys: 'Ctrl+Alt+Shift+C' },
]

/**
 * The entries of the right-click menu of an item. A source offers Copy, Open (when its text is an address) and
 * Delete. A song offers, in groups, Copy and Open for the official video, the original and the best audio, and
 * Copy for its details, then Replace video, to give it another video by hand. Every entry is shown, and the ones the
 * song has no video for are disabled.
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
  const links = await linksOf(deps, id)
  const entries: MenuEntry[] = []
  for (const [index, group] of songGroups.entries()) {
    const has = group.pick === 'details' || linkOf(links, group.pick) !== undefined
    entries.push({
      key:             `copy-${group.pick}`,
      label:           `Copy ${group.name}`,
      shortcut:        group.copyKeys,
      disabled:        !has,
      separatorBefore: index > 0,
      run:             () => { run(copyItem(deps, kind, id, group.pick)) },
    })
    if (group.openKeys !== undefined) {
      entries.push({
        key:      `open-${group.pick}`,
        label:    `Open ${group.name}`,
        shortcut: group.openKeys,
        disabled: !has,
        run:      () => { run(openItem(deps, kind, id, group.pick)) },
      })
    }
  }
  entries.push({ key: 'replace', label: 'Replace video…', separatorBefore: true, run: () => { deps.replace(id) } })

  return entries
}
