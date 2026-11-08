import { Field, HStack, Input, NativeSelect, NumberInput } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { choiceLabel } from './preference-fields.content.ts'
import type { FieldText } from './preference-fields.content.ts'

/** A setting: its name, the control and the line that says what it does. */
export function SettingField ({ text, children }: { text: FieldText, children: ReactNode }) {
  return (
    <Field.Root>
      <Field.Label fontWeight='semibold'>{text.label}</Field.Label>
      {children}
      <Field.HelperText>{text.hint}</Field.HelperText>
    </Field.Root>
  )
}

/** A setting with a list of choices. */
export function ChoiceField ({ text, value, choices, onChange }: {
  text:     FieldText
  value:    string
  choices:  string[]
  onChange: (value: string) => void
}) {
  return (
    <SettingField text={text}>
      <NativeSelect.Root>
        <NativeSelect.Field value={value} onChange={event => { onChange(event.target.value) }}>
          {choices.map(choice => <option key={choice} value={choice}>{choiceLabel(choice)}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </SettingField>
  )
}

/** A setting that is on or off, shown as Yes and No. */
export function YesNoField ({ text, value, onChange }: {
  text:     FieldText
  value:    boolean
  onChange: (value: boolean) => void
}) {
  return (
    <ChoiceField
      text={text}
      value={value ? 'yes' : 'no'}
      choices={['yes', 'no']}
      onChange={choice => { onChange(choice === 'yes') }}
    />
  )
}

/** A setting that is a number, changed with the buttons or by typing. */
export function StepperField ({ text, value, min, max, step = 1, onChange }: {
  text:     FieldText
  value:    number
  min:      number
  max:      number
  step?:    number
  onChange: (value: number) => void
}) {
  return (
    <SettingField text={text}>
      <NumberInput.Root
        min={min}
        max={max}
        step={step}
        value={String(value)}
        onValueChange={event => {
          if (!Number.isNaN(event.valueAsNumber)) onChange(event.valueAsNumber)
        }}
      >
        <NumberInput.Control />
        <NumberInput.Input />
      </NumberInput.Root>
    </SettingField>
  )
}

/** A setting that is a folder, chosen with the system's folder chooser. */
export function FolderField ({ text, value, onBrowse }: {
  text:     FieldText
  value:    string
  onBrowse: () => void
}) {
  return (
    <SettingField text={text}>
      <HStack w='full'>
        <Input readOnly value={value} />
        <button type='button' onClick={onBrowse}>Browse…</button>
      </HStack>
    </SettingField>
  )
}
