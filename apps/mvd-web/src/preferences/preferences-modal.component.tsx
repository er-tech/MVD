import { Alert, Button, Stack, Tabs } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend, PreferenceOptions, Preferences } from '../backend'
import { ModalFrame } from '../modalframe'
import { AdvancedTab } from './advanced-tab.component.tsx'
import { DownloadTab } from './download-tab.component.tsx'
import { OutputTab } from './output-tab.component.tsx'
import { ThemeTab } from './theme-tab.component.tsx'

/** The props of {@link PreferencesModal}. */
export interface PreferencesModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that keeps the preferences. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

interface LoadedPreferences {
  values:  Preferences
  options: PreferenceOptions
}

function PreferencesForm ({ backend, onClose }: Omit<PreferencesModalProps, 'open'>) {
  const [loaded, setLoaded] = useState<LoadedPreferences | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fail = (error_: unknown) => {
    setError(error_ instanceof Error ? error_.message : String(error_))
  }

  useEffect(() => {
    let current = true
    const load = async () => {
      try {
        const [values, options] = await Promise.all([backend.getPreferences(), backend.getPreferenceOptions()])
        if (current) setLoaded({ values, options })
      } catch (error_) {
        if (current) fail(error_)
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [backend])

  const change = (patch: Partial<Preferences>) => {
    setLoaded(previous => previous && { ...previous, values: { ...previous.values, ...patch } })
  }

  const save = async () => {
    if (!loaded) return
    setSaving(true)
    try {
      await backend.setPreferences(loaded.values)
      onClose()
    } catch (error_) {
      fail(error_)
      setSaving(false)
    }
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Preferences'
      size='xl'
      fill
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!loaded} loading={saving}>Save</Button>
        </>
      )}
    >
      <Stack gap='4' flex='1' minH='0'>
        {error !== '' && (
          <Alert.Root status='error'>
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}
        {loaded && (
          <Tabs.Root defaultValue='output' variant='line' display='flex' flexDirection='column' flex='1' minH='0'>
            <Tabs.List>
              <Tabs.Trigger value='output'>Output</Tabs.Trigger>
              <Tabs.Trigger value='download'>Download</Tabs.Trigger>
              <Tabs.Trigger value='advanced'>Advanced</Tabs.Trigger>
              <Tabs.Trigger value='theme'>Theme</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value='output' flex='1' minH='0' overflowY='auto'>
              <OutputTab values={loaded.values} options={loaded.options} change={change} backend={backend} fail={fail} />
            </Tabs.Content>
            <Tabs.Content value='download' flex='1' minH='0' overflowY='auto'>
              <DownloadTab values={loaded.values} options={loaded.options} change={change} backend={backend} fail={fail} />
            </Tabs.Content>
            <Tabs.Content value='advanced' flex='1' minH='0' overflowY='auto'>
              <AdvancedTab values={loaded.values} options={loaded.options} change={change} backend={backend} fail={fail} />
            </Tabs.Content>
            <Tabs.Content value='theme' flex='1' minH='0' overflowY='auto'>
              <ThemeTab />
            </Tabs.Content>
          </Tabs.Root>
        )}
      </Stack>
    </ModalFrame>
  )
}

/**
 * The window where the person changes the preferences.
 *
 * It loads the values and the choices from the backend each time it opens, and shows them in the tabs
 * Output, Download, Advanced and Theme. The tabs stay in place and the content of each tab scrolls.
 * Save sends the values. A refusal shows in the modal, which stays open. Cancel sends nothing.
 *
 * @param props - see {@link PreferencesModalProps}.
 * @returns the modal, or nothing when closed.
 */
export function PreferencesModal ({ open, backend, onClose }: PreferencesModalProps) {
  return open ? <PreferencesForm backend={backend} onClose={onClose} /> : null
}
