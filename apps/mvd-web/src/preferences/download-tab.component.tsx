import { Stack } from '@chakra-ui/react'
import { fieldText } from './preference-fields.content.ts'
import type { PreferenceTabProps } from './preference-tab.contract.ts'
import { ChoiceField, StepperField, YesNoField } from './setting-field.component.tsx'

/** The Download tab: the quality of the files and how a download is tried again. */
export function DownloadTab ({ values, options, change }: PreferenceTabProps) {
  return (
    <Stack gap='5'>
      <ChoiceField
        text={fieldText.videoQuality}
        value={values.videoQuality}
        choices={options.videoQualities}
        onChange={videoQuality => { change({ videoQuality }) }}
      />
      <ChoiceField
        text={fieldText.audioQuality}
        value={values.audioQuality}
        choices={options.audioQualities}
        onChange={audioQuality => { change({ audioQuality }) }}
      />
      <ChoiceField
        text={fieldText.mergeFormat}
        value={values.mergeFormat}
        choices={options.mergeFormats}
        onChange={mergeFormat => { change({ mergeFormat }) }}
      />
      <ChoiceField
        text={fieldText.officialVideo}
        value={values.officialVideo}
        choices={options.officialVideos}
        onChange={officialVideo => { change({ officialVideo }) }}
      />
      <YesNoField text={fieldText.betterAudio} value={values.betterAudio} onChange={betterAudio => { change({ betterAudio }) }} />
      <StepperField
        text={fieldText.maxDownloads}
        value={values.maxDownloads}
        min={options.minDownloads}
        max={options.maxDownloads}
        onChange={maxDownloads => { change({ maxDownloads }) }}
      />
      <YesNoField text={fieldText.autoRetry} value={values.autoRetry} onChange={autoRetry => { change({ autoRetry }) }} />
      <StepperField
        text={fieldText.retryCycles}
        value={values.retryCycles}
        min={1}
        max={999}
        onChange={retryCycles => { change({ retryCycles }) }}
      />
      <StepperField
        text={fieldText.retryWaitSeconds}
        value={values.retryWaitSeconds}
        min={1}
        max={3600}
        step={5}
        onChange={retryWaitSeconds => { change({ retryWaitSeconds }) }}
      />
    </Stack>
  )
}
