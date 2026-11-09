import { RadioGroup, Stack, Text } from '@chakra-ui/react'
import { themeModes, useTheme } from '../theme'
import type { ThemeMode } from '../theme'

const modeText: Record<ThemeMode, { label: string, hint: string }> = {
  light:  { label: 'Light', hint: 'Dark text on a light background.' },
  dark:   { label: 'Dark', hint: 'Light text on a dark background, easier on the eyes at night.' },
  system: { label: 'System', hint: 'Follows the choice of your computer, and changes with it.' },
}

/** The Theme tab: light, dark, or what the system uses. A choice shows at once and is kept; Cancel does not undo it. */
export function ThemeTab () {
  const { mode, setMode } = useTheme()

  return (
    <RadioGroup.Root
      value={mode}
      onValueChange={event => {
        setMode(themeModes.find(each => each === event.value) ?? 'system')
      }}
    >
      <Stack gap='4'>
        {themeModes.map(each => (
          <RadioGroup.Item key={each} value={each}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator />
            <Stack gap='0'>
              <RadioGroup.ItemText fontWeight='semibold'>{modeText[each].label}</RadioGroup.ItemText>
              <Text fontSize='xs' color='fg.muted'>{modeText[each].hint}</Text>
            </Stack>
          </RadioGroup.Item>
        ))}
      </Stack>
    </RadioGroup.Root>
  )
}
