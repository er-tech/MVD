import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { PreferencesModal } from './preferences-modal.component.tsx'

afterEach(cleanup)

async function open () {
  const backend = fakeBackend()
  const onClose = vi.fn()
  const setPreferences = vi.spyOn(backend, 'setPreferences')
  render(
    <ChakraProvider value={defaultSystem}>
      <PreferencesModal open backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )
  await screen.findByLabelText('File name template')

  return { backend, onClose, setPreferences }
}

describe('PreferencesModal', () => {
  it('loads the preferences and the options', async () => {
    const { backend } = await open()
    expect(backend.calls).toEqual(expect.arrayContaining(['getPreferences()', 'getPreferenceOptions()']))
    expect((screen.getByLabelText<HTMLInputElement>('File name template')).value).toBe('%(title)s.%(ext)s')
    expect(screen.getByRole('option', { name: 'Never look for it' })).toBeTruthy()
  })

  it('saves the edited values and closes', async () => {
    const { onClose, setPreferences } = await open()
    fireEvent.change(screen.getByLabelText('File name template'), { target: { value: '%(artist)s' } })
    fireEvent.change(screen.getByLabelText('Official video'), { target: { value: 'only' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(setPreferences).toHaveBeenCalledWith(expect.objectContaining({
      outputTemplate: '%(artist)s',
      officialVideo:  'only',
      maxDownloads:   4,
    }))
  })

  it('shows a refusal from Go and stays open', async () => {
    const { backend, onClose } = await open()
    backend.failNext.set('setPreferences', 'The folder cannot be written')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('The folder cannot be written')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('sends nothing on Cancel', async () => {
    const { setPreferences, onClose } = await open()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(setPreferences).not.toHaveBeenCalled()
  })

  it('takes the folder the person picks and keeps the old one on cancel', async () => {
    const { backend, setPreferences, onClose } = await open()
    backend.answers.folder = String.raw`D:\Songs`
    fireEvent.click(screen.getByRole('button', { name: 'Browse…' }))
    await waitFor(() => expect((screen.getByLabelText<HTMLInputElement>('Output folder')).value).toBe(String.raw`D:\Songs`))
    backend.answers.folder = ''
    fireEvent.click(screen.getByRole('button', { name: 'Browse…' }))
    await waitFor(() => expect(backend.calls.filter(call => call === 'pickOutputFolder()')).toHaveLength(2))
    expect((screen.getByLabelText<HTMLInputElement>('Output folder')).value).toBe(String.raw`D:\Songs`)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(setPreferences).toHaveBeenCalledWith(expect.objectContaining({ outputDir: String.raw`D:\Songs` }))
  })

  it('saves a switch the person turned', async () => {
    const { setPreferences, onClose } = await open()
    const betterAudio = screen.getByLabelText<HTMLInputElement>('Look for better audio')
    fireEvent.click(betterAudio)
    await waitFor(() => expect(betterAudio.checked).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(setPreferences).toHaveBeenCalledWith(expect.objectContaining({ betterAudio: true }))
  })
})
