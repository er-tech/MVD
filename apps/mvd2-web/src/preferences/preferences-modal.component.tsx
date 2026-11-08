import { Alert, Button, Field, Heading, HStack, Input, NativeSelect, NumberInput, Stack, Switch } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend, PreferenceOptions, Preferences } from '../backend'
import { ModalFrame } from '../modalframe'

/** The props of {@link PreferencesModal}. */
export interface PreferencesModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that keeps the preferences. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

type SwitchKey = 'saveNotFound' | 'betterAudio' | 'autoRetry' | 'checkForUpdates' | 'autoCookies' | 'createLogFile'

const officialLabels: Record<string, string> = {
  yes:  'Use the official video when there is one',
  no:   'Never look for it',
  only: 'Only songs that have one',
}

const songSwitches: { key: SwitchKey, label: string }[] = [
  { key: 'saveNotFound', label: 'Keep a list of the songs not found' },
  { key: 'betterAudio', label: 'Look for better audio' },
  { key: 'autoRetry', label: 'Try a failed song again' },
]

const appSwitches: { key: SwitchKey, label: string }[] = [
  { key: 'checkForUpdates', label: 'Check for updates' },
  { key: 'autoCookies', label: 'Take the cookies from the browser' },
  { key: 'createLogFile', label: 'Write a log file' },
]

interface LoadedPreferences {
  values:  Preferences
  options: PreferenceOptions
}

const plain = (names: string[]) => names.map(name => ({ value: name, label: name }))

function SelectField ({ label, value, choices, onChange }: {
  label:    string
  value:    string
  choices:  { value: string, label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Field value={value} onChange={event => onChange(event.target.value)}>
          {choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  )
}

function PreferencesForm ({ backend, onClose }: Omit<PreferencesModalProps, 'open'>) {
  const [loaded, setLoaded] = useState<LoadedPreferences | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let current = true
    const load = async () => {
      try {
        const [values, options] = await Promise.all([backend.getPreferences(), backend.getPreferenceOptions()])
        if (current) setLoaded({ values, options })
      } catch (error_) {
        if (current) setError(error_ instanceof Error ? error_.message : String(error_))
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

  const browse = async () => {
    try {
      const folder = await backend.pickOutputFolder()
      if (folder !== '') change({ outputDir: folder })
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_))
    }
  }

  const save = async () => {
    if (!loaded) return
    setSaving(true)
    try {
      await backend.setPreferences(loaded.values)
      onClose()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_))
      setSaving(false)
    }
  }

  const switches = (list: { key: SwitchKey, label: string }[], values: Preferences) => list.map(item => (
    <Switch.Root
      key={item.key}
      checked={values[item.key]}
      onCheckedChange={event => change({ [item.key]: event.checked })}
    >
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>{item.label}</Switch.Label>
    </Switch.Root>
  ))

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Preferences'
      size='lg'
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!loaded} loading={saving}>Save</Button>
        </>
      )}
    >
      <Stack gap='4'>
        {error !== '' && (
          <Alert.Root status='error'>
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}
        {loaded && (
          <>
            <Heading size='sm'>Downloads</Heading>
            <Field.Root>
              <Field.Label>Output folder</Field.Label>
              <HStack w='full'>
                <Input readOnly value={loaded.values.outputDir} />
                <Button variant='outline' onClick={() => void browse()}>Browse…</Button>
              </HStack>
            </Field.Root>
            <Field.Root>
              <Field.Label>Downloads at the same time</Field.Label>
              <NumberInput.Root
                min={loaded.options.minDownloads}
                max={loaded.options.maxDownloads}
                value={String(loaded.values.maxDownloads)}
                onValueChange={event => {
                  if (!Number.isNaN(event.valueAsNumber)) change({ maxDownloads: event.valueAsNumber })
                }}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>File name template</Field.Label>
              <Input value={loaded.values.outputTemplate} onChange={event => change({ outputTemplate: event.target.value })} />
            </Field.Root>

            <Heading size='sm'>Songs</Heading>
            <SelectField
              label='Video quality'
              value={loaded.values.videoQuality}
              choices={plain(loaded.options.videoQualities)}
              onChange={videoQuality => change({ videoQuality })}
            />
            <SelectField
              label='Audio quality'
              value={loaded.values.audioQuality}
              choices={plain(loaded.options.audioQualities)}
              onChange={audioQuality => change({ audioQuality })}
            />
            <SelectField
              label='Official video'
              value={loaded.values.officialVideo}
              choices={loaded.options.officialVideos.map(value => ({ value, label: officialLabels[value] ?? value }))}
              onChange={officialVideo => change({ officialVideo })}
            />
            {switches(songSwitches, loaded.values)}

            <Heading size='sm'>App</Heading>
            {switches(appSwitches, loaded.values)}
          </>
        )}
      </Stack>
    </ModalFrame>
  )
}

/**
 * The window where the person changes the preferences.
 *
 * It loads the values and the choices from the backend each time it opens.
 * Save sends the values. A refusal shows in the modal, which stays open. Cancel sends nothing.
 *
 * @param props - see {@link PreferencesModalProps}.
 * @returns the modal, or nothing when closed.
 */
export function PreferencesModal ({ open, backend, onClose }: PreferencesModalProps) {
  return open ? <PreferencesForm backend={backend} onClose={onClose} /> : null
}
