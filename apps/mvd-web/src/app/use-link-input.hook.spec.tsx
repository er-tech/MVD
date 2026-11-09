import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { useLinkInput } from './use-link-input.hook.ts'

afterEach(cleanup)

const link = 'https://www.youtube.com/playlist?list=PL1'

function Harness ({ backend, notify, enabled = true }: {
  backend:  ReturnType<typeof fakeBackend>
  notify:   (message: string) => void
  enabled?: boolean
}) {
  useLinkInput({ backend, enabled, notify })

  return <input aria-label='field' />
}

const shown = (enabled = true) => {
  const backend = fakeBackend()
  const notify = vi.fn()
  render(<Harness backend={backend} notify={notify} enabled={enabled} />)

  return { backend, notify }
}

const pasteOf = (text: string) => {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })

  return event
}

const dropOf = (types: Record<string, string>) => {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { types: Object.keys(types), getData: (type: string) => types[type] ?? '' } })

  return event
}

describe('useLinkInput', () => {
  it('adds a link pasted outside a field', async () => {
    const { backend } = shown()
    dispatchEvent(pasteOf(`  ${link}  `))
    await waitFor(() => expect(backend.calls).toContain(`addSource(${link})`))
  })

  it('leaves a paste into a field to the field', () => {
    const { backend } = shown()
    screen.getByLabelText('field').dispatchEvent(pasteOf(link))
    expect(backend.calls).toEqual([])
  })

  it('ignores a paste that has no valid link', () => {
    const { backend } = shown()
    dispatchEvent(pasteOf('just words'))
    expect(backend.calls).toEqual([])
  })

  it('adds a link dropped from a browser', async () => {
    const { backend } = shown()
    dispatchEvent(dropOf({ 'text/uri-list': link, 'text/plain': 'A page' }))
    await waitFor(() => expect(backend.calls).toContain(`addSource(${link})`))
  })

  it('says so when what was dropped is not a YouTube link', () => {
    const { backend, notify } = shown()
    dispatchEvent(dropOf({ 'text/plain': 'https://example.com' }))
    expect(backend.calls).toEqual([])
    expect(notify).toHaveBeenCalledWith('That is not a YouTube link.')
  })

  it('opens a .mvd file dropped on the window', async () => {
    const { backend } = shown()
    backend.sendFileDrop([String.raw`C:\Lists\one.txt`, String.raw`C:\Lists\Dance.MVD`])
    await waitFor(() => expect(backend.calls).toContain(String.raw`openListPath(C:\Lists\Dance.MVD)`))
  })

  it('tells the person when the files dropped are not a list', () => {
    const { backend, notify } = shown()
    backend.sendFileDrop(['song.mp3'])
    expect(backend.calls).toEqual([])
    expect(notify).toHaveBeenCalled()
  })

  it('does nothing while a window of the page is open', () => {
    const { backend } = shown(false)
    dispatchEvent(pasteOf(link))
    dispatchEvent(dropOf({ 'text/plain': link }))
    backend.sendFileDrop(['a.mvd'])
    expect(backend.calls).toEqual([])
    fireEvent.click(screen.getByLabelText('field'))
  })
})
