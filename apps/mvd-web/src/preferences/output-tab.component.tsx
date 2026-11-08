import { Stack } from '@chakra-ui/react'
import { fieldText } from './preference-fields.content.ts'
import type { PreferenceTabProps } from './preference-tab.contract.ts'
import { FolderField, SettingField } from './setting-field.component.tsx'
import { TemplateEditor } from './template-editor.component.tsx'

/** The Output tab: where the videos go and how the files are named. */
export function OutputTab ({ values, change, backend, fail }: PreferenceTabProps) {
  const browse = async () => {
    try {
      const folder = await backend.pickOutputFolder()
      if (folder !== '') change({ outputDir: folder })
    } catch (error) {
      fail(error)
    }
  }

  return (
    <Stack gap='5'>
      <FolderField text={fieldText.outputDir} value={values.outputDir} onBrowse={() => void browse()} />
      <SettingField text={fieldText.outputTemplate}>
        <TemplateEditor value={values.outputTemplate} onChange={outputTemplate => { change({ outputTemplate }) }} />
      </SettingField>
    </Stack>
  )
}
