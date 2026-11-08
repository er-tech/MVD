import { Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { fieldText } from './preference-fields.content.ts'
import type { PreferenceTabProps } from './preference-tab.contract.ts'
import { ChoiceField, FolderField, StepperField, YesNoField } from './setting-field.component.tsx'
import { YouTubeSignIn } from './youtube-sign-in.component.tsx'

/** A button for an action of the host, with the line that says what it does and what came of it. */
function ActionButton ({ label, hint, run, fail }: {
  label: string
  hint:  string
  run:   () => Promise<string>
  fail:  (error: unknown) => void
}) {
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const press = async () => {
    setWorking(true)
    try {
      setMessage(await run())
    } catch (error) {
      fail(error)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Stack gap='1'>
      <Button variant='outline' loading={working} onClick={() => void press()}>{label}</Button>
      <Text fontSize='xs' color='fg.muted'>{message === '' ? hint : message}</Text>
    </Stack>
  )
}

/** The Advanced tab: how the downloads are fetched, the login, the log and the app itself. */
export function AdvancedTab ({ values, options, change, backend, fail }: PreferenceTabProps) {
  const browseLog = async () => {
    try {
      const folder = await backend.pickOutputFolder()
      if (folder !== '') change({ logDir: folder })
    } catch (error) {
      fail(error)
    }
  }

  return (
    <Stack gap='5'>
      <StepperField
        text={fieldText.concurrentFragments}
        value={values.concurrentFragments}
        min={0}
        max={16}
        onChange={concurrentFragments => { change({ concurrentFragments }) }}
      />
      <StepperField
        text={fieldText.startTimeoutSeconds}
        value={values.startTimeoutSeconds}
        min={10}
        max={3600}
        step={10}
        onChange={startTimeoutSeconds => { change({ startTimeoutSeconds }) }}
      />
      <ChoiceField
        text={fieldText.cookieSource}
        value={values.cookieSource}
        choices={options.cookieSources}
        onChange={cookieSource => { change({ cookieSource }) }}
      />
      <YesNoField text={fieldText.saveNotFound} value={values.saveNotFound} onChange={saveNotFound => { change({ saveNotFound }) }} />
      <YesNoField text={fieldText.createLogFile} value={values.createLogFile} onChange={enabled => { change({ createLogFile: enabled }) }} />
      <FolderField text={fieldText.logDir} value={values.logDir} onBrowse={() => void browseLog()} />
      <YesNoField
        text={fieldText.checkForUpdates}
        value={values.checkForUpdates}
        onChange={checkForUpdates => { change({ checkForUpdates }) }}
      />
      {options.canSignIn && <YouTubeSignIn backend={backend} />}
      {options.canMove && <ActionButton label={fieldText.move.label} hint={fieldText.move.hint} run={() => backend.moveApp()} fail={fail} />}
      {options.canUninstall && (
        <ActionButton label={fieldText.uninstall.label} hint={fieldText.uninstall.hint} run={() => backend.uninstallApp()} fail={fail} />
      )}
    </Stack>
  )
}
