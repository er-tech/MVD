import { Field, Input, Stack, Text } from '@chakra-ui/react'
import type { KeyboardEvent } from 'react'

/** What the person writes to find music by name. */
export interface MusicSearch {
  artist: string
  album:  string
  song:   string
}

/** The props of {@link MusicSearchFields}. */
export interface MusicSearchFieldsProps {
  value:    MusicSearch
  onChange: (value: MusicSearch) => void
  /** Called when the person presses Enter in a field. */
  onSubmit: () => void
}

/**
 * The fields of a search by name: an artist alone finds every song of the artist, with an album the songs of
 * the album, with a song that one song. The artist is needed.
 *
 * @param props - see {@link MusicSearchFieldsProps}.
 * @returns the three fields and a line that says what each search finds.
 */
export function MusicSearchFields ({ value, onChange, onSubmit }: MusicSearchFieldsProps) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    onSubmit()
  }
  const field = (key: keyof MusicSearch, label: string, placeholder: string, required = false) => (
    <Field.Root required={required}>
      <Field.Label>{label}{required && <Field.RequiredIndicator />}</Field.Label>
      <Input
        value={value[key]}
        placeholder={placeholder}
        onChange={event => { onChange({ ...value, [key]: event.target.value }) }}
        onKeyDown={onKeyDown}
      />
    </Field.Root>
  )

  return (
    <Stack gap='3'>
      {field('artist', 'Artist', 'Daft Punk', true)}
      {field('album', 'Album', 'Discovery')}
      {field('song', 'Song', 'One More Time')}
      <Text fontSize='xs' color='fg.muted'>
        An artist alone gives every song of the artist. Add an album for its songs, or a song for that one.
      </Text>
    </Stack>
  )
}
