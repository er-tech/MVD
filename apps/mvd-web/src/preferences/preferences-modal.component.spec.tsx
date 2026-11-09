import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBackend } from '../testing'
import { PreferencesModal } from './preferences-modal.component.tsx'

afterEach(cleanup)

async function open (setup: (backend: ReturnType<typeof fakeBackend>) => void = () => {}) {
  const backend = fakeBackend()
  setup(backend)
  const onClose = vi.fn()
  const setPreferences = vi.spyOn(backend, 'setPreferences')
  render(
    <ChakraProvider value={defaultSystem}>
      <PreferencesModal open backend={backend} onClose={onClose} />
    </ChakraProvider>,
  )
  await screen.findByText('Videos Output Folder')

  return { backend, onClose, setPreferences }
}

const tab = (name: string) => {
  fireEvent.click(screen.getByRole('tab', { name }))
}

describe('PreferencesModal', () => {
  it('loads the preferences and the options', async () => {
    const { backend } = await open()
    expect(backend.calls).toEqual(expect.arrayContaining(['getPreferences()', 'getPreferenceOptions()']))
    expect((screen.getByLabelText<HTMLInputElement>('Videos Output Folder')).value).toBe(String.raw`C:\Music`)
    expect(screen.getByText('Example: Part Time Lover.mp4')).toBeTruthy()
  })

  it('has the tabs Output, Download, Advanced and Theme', async () => {
    await open()
    expect(screen.getAllByRole('tab').map(item => item.textContent)).toEqual(['Output', 'Download', 'Advanced', 'Theme'])
  })

  it('says what each setting does, as the old window did', async () => {
    await open()
    expect(screen.getByText(/Add a block such as ARTIST or TITLE/)).toBeTruthy()
    tab('Download')
    expect(screen.getByText('The best picture quality to download. A lower one makes smaller files.')).toBeTruthy()
    expect(screen.getByText(/the best quality of the song is fetched and put in place of its sound/)).toBeTruthy()
    tab('Advanced')
    expect(screen.getByText(/Once a day, ask whether a newer MVD is out/)).toBeTruthy()
  })

  it('saves the values edited in every tab and closes', async () => {
    const { onClose, setPreferences } = await open()
    fireEvent.click(screen.getByRole('button', { name: '+ ARTIST' }))
    tab('Download')
    fireEvent.change(screen.getByLabelText('Download Official Music Video'), { target: { value: 'only' } })
    fireEvent.change(screen.getByLabelText('Merge Format'), { target: { value: 'mkv' } })
    fireEvent.click(screen.getByLabelText('Best Audio On The Video'))
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('Best Audio On The Video').checked).toBe(true))
    tab('Advanced')
    fireEvent.change(screen.getByLabelText("Use my browser's YouTube login"), { target: { value: 'firefox' } })
    fireEvent.click(screen.getByLabelText('Create Log File'))
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('Create Log File').checked).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(setPreferences).toHaveBeenCalledWith(expect.objectContaining({
      outputTemplate: '%(title)s%(artist,uploader)s.%(ext)s',
      officialVideo:  'only',
      mergeFormat:    'mkv',
      betterAudio:    true,
      cookieSource:   'firefox',
      createLogFile:  false,
      maxDownloads:   4,
      retryCycles:    30,
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
    await waitFor(() => expect((screen.getByLabelText<HTMLInputElement>('Videos Output Folder')).value).toBe(String.raw`D:\Songs`))
    backend.answers.folder = ''
    fireEvent.click(screen.getByRole('button', { name: 'Browse…' }))
    await waitFor(() => expect(backend.calls.filter(call => call === 'pickOutputFolder()')).toHaveLength(2))
    expect((screen.getByLabelText<HTMLInputElement>('Videos Output Folder')).value).toBe(String.raw`D:\Songs`)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(setPreferences).toHaveBeenCalledWith(expect.objectContaining({ outputDir: String.raw`D:\Songs` }))
  })

  it('offers sign-in, move and uninstall only where the system has them', async () => {
    await open()
    tab('Advanced')
    expect(screen.queryByRole('button', { name: /Uninstall MVD/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Sign in to YouTube/ })).toBeNull()
    cleanup()
    await open(backend => {
      backend.answers.options = { ...backend.answers.options, canSignIn: true, canMove: true, canUninstall: true }
    })
    tab('Advanced')
    expect(await screen.findByRole('button', { name: 'Sign in to YouTube…' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Move MVD to its own folder…' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uninstall MVD…' })).toBeTruthy()
  })

  it('asks Go to uninstall on the button and tells what came of it', async () => {
    const { backend } = await open(fake => {
      fake.answers.options = { ...fake.answers.options, canUninstall: true }
    })
    tab('Advanced')
    fireEvent.click(await screen.findByRole('button', { name: 'Uninstall MVD…' }))
    expect(await screen.findByText('MVD is being removed.')).toBeTruthy()
    expect(backend.calls).toContain('uninstallApp()')
  })
})
