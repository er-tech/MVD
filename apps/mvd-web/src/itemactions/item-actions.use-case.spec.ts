import { afterEach, describe, expect, it, vi } from 'vitest'
import { LibraryStore } from '../library'
import { fakeBackend } from '../testing'
import { copyItem, menuEntriesOf, openItem } from './item-actions.use-case.ts'
import type { ItemActionDeps } from './item-actions.use-case.ts'

const written: string[] = []
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: (text: string) => {
      written.push(text)

      return Promise.resolve()
    },
  },
  configurable: true,
})

afterEach(() => {
  written.length = 0
})

function deps (links: { label: string, url: string }[] = []) {
  const backend = fakeBackend()
  backend.answers.detail = { kind: 'song', id: 's1', title: 'T', fields: [], links, log: [] }
  const store = new LibraryStore()
  store.sources.replace([{ id: 'p0', url: 'https://www.youtube.com/playlist?list=PL', title: 'List', status: 'listed', error: '', position: 1, songs: 1, done: 0, failed: 0, finding: 0 }])
  store.songs.replace([{ id: 's1', sourceId: 'p0', position: 1, artist: 'Double You', title: 'Part Time Lover', status: 'waiting', tone: 'dim', percent: 0, speed: 0, version: '', height: 0, audioKbps: 0, error: '' }])

  return { backend, store, notify: vi.fn<(message: string) => void>(), remove: vi.fn<(id: string) => void>() } satisfies ItemActionDeps
}

const original = { label: 'Video in the playlist', url: 'https://www.youtube.com/watch?v=o' }
const official = { label: 'Official video found', url: 'https://www.youtube.com/watch?v=f' }

describe('copyItem', () => {
  it('copies the address of a source', async () => {
    await copyItem(deps(), 'source', 'p0')
    expect(written).toEqual(['https://www.youtube.com/playlist?list=PL'])
  })

  it('copies the kind of video that is asked for', async () => {
    const all = deps([original, official])
    await copyItem(all, 'song', 's1')
    await copyItem(all, 'song', 's1', 'original')
    expect(written).toEqual([official.url, original.url])
  })

  it('says so, and copies nothing, when the song has no such video', async () => {
    const all = deps([original])
    await copyItem(all, 'song', 's1')
    expect(written).toEqual([])
    expect(all.notify).toHaveBeenCalledWith('There is no official video to use.')
  })

  it('copies the artist and the title for the details', async () => {
    await copyItem(deps(), 'song', 's1', 'details')
    expect(written).toEqual(['Double You, Part Time Lover'])
  })
})

describe('openItem', () => {
  it('opens the video that is asked for, and says so when there is none', async () => {
    const withLinks = deps([original, official])
    await openItem(withLinks, 'song', 's1')
    await openItem(withLinks, 'song', 's1', 'original')
    expect(withLinks.backend.calls).toContain(`openLink(${official.url})`)
    expect(withLinks.backend.calls).toContain(`openLink(${original.url})`)
    const bare = deps()
    await openItem(bare, 'song', 's1')
    expect(bare.notify).toHaveBeenCalledWith('There is no official video to use.')
  })
})

describe('menuEntriesOf', () => {
  it('gives a source Copy, Open and Delete with their keys', async () => {
    const all = deps()
    const entries = await menuEntriesOf(all, 'source', 'p0')
    expect(entries.map(entry => [entry.label, entry.shortcut])).toEqual([['Copy', 'Ctrl+C'], ['Open', 'Enter'], ['Delete', 'Delete']])
    entries[2].run()
    expect(all.remove).toHaveBeenCalledWith('p0')
  })

  it('does not offer Open for a source that is not an address', async () => {
    const all = deps()
    all.store.sources.replace([{ id: 'p0', url: 'Artist, Album', title: 'x', status: 'listed', error: '', position: 1, songs: 0, done: 0, failed: 0, finding: 0 }])
    const entries = await menuEntriesOf(all, 'source', 'p0')
    expect(entries[1].disabled).toBe(true)
  })

  it('gives a song every entry, with the ones it has no video for disabled', async () => {
    const entries = await menuEntriesOf(deps([original, official]), 'song', 's1')
    expect(entries.map(entry => [entry.label, entry.shortcut, entry.disabled])).toEqual([
      ['Copy official', 'Ctrl+C', false], ['Open official', 'Enter', false],
      ['Copy original', 'Ctrl+Shift+C', false], ['Open original', 'Shift+Enter', false],
      ['Copy best audio', 'Ctrl+Alt+C', true], ['Open best audio', 'Ctrl+Alt+Enter', true],
      ['Copy song details', 'Ctrl+Alt+Shift+C', false],
    ])
  })
})
