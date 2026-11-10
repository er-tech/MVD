import { Alert, Button, Field, RadioGroup, Stack, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Backend } from '../backend'
import { ModalFrame } from '../modalframe'
import { MusicSearchFields } from './music-search-fields.component.tsx'
import type { MusicSearch } from './music-search-fields.component.tsx'

/** The props of {@link AddSourceModal}. */
export interface AddSourceModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** The Go side that takes the links. */
  backend: Backend
  /** Called when the modal closes. */
  onClose: () => void
}

interface LinkFailure {
  url:     string
  message: string
}

type Mode = 'link' | 'search'

const noSearch: MusicSearch = { artist: '', album: '', song: '' }

const splitLinks = (text: string): string[] => text.split(/\s+/).filter(link => link !== '')

function AddSourceForm ({ backend, onClose }: Omit<AddSourceModalProps, 'open'>) {
  const [text, setText] = useState('')
  const [failures, setFailures] = useState<LinkFailure[]>([])
  const [working, setWorking] = useState(false)
  const [mode, setMode] = useState<Mode>('link')
  const [search, setSearch] = useState(noSearch)
  const canAdd = !working && (mode === 'link' ? splitLinks(text).length > 0 : search.artist.trim() !== '')

  const addSearch = async () => {
    setWorking(true)
    try {
      await backend.addMusicSearch(search.artist, search.album, search.song)
      onClose()
    } catch (error) {
      setFailures([{ url: 'The search', message: error instanceof Error ? error.message : String(error) }])
    }
    setWorking(false)
  }

  const add = async () => {
    if (!canAdd) return
    if (mode === 'search') {
      await addSearch()

      return
    }
    setWorking(true)
    const failed: LinkFailure[] = []
    for (const url of splitLinks(text)) {
      try {
        await backend.addSource(url)
      } catch (error) {
        failed.push({ url, message: error instanceof Error ? error.message : String(error) })
      }
    }
    setWorking(false)
    if (failed.length === 0) {
      onClose()

      return
    }
    setText(failed.map(failure => failure.url).join('\n'))
    setFailures(failed)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.key === 'Enter' && event.ctrlKey)) {
      return
    }

    event.preventDefault()
    void add()
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      title='Add music'
      footer={(
        <>
          <Button variant='ghost' onClick={onClose}>Cancel</Button>
          <Button onClick={() => void add()} disabled={!canAdd} loading={working}>Add</Button>
        </>
      )}
    >
      <Stack gap='3'>
        <RadioGroup.Root
          value={mode}
          onValueChange={event => {
            setMode(event.value === 'search' ? 'search' : 'link')
            setFailures([])
          }}
        >
          <Stack direction='row' gap='6'>
            <RadioGroup.Item value='link'>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>Link</RadioGroup.ItemText>
            </RadioGroup.Item>
            <RadioGroup.Item value='search'>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>Search by name</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Stack>
        </RadioGroup.Root>
        {mode === 'link'
          ? (
              <Field.Root>
                <Field.Label>Links, one on each line</Field.Label>
                <Textarea
                  rows={6}
                  value={text}
                  onChange={event => setText(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder='Paste a playlist, an album or a song link'
                />
              </Field.Root>
            )
          : <MusicSearchFields value={search} onChange={setSearch} onSubmit={() => void add()} />}
        {failures.map(failure => (
          <Alert.Root key={failure.url} status='error'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{failure.url}</Alert.Title>
              <Alert.Description>{failure.message}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ))}
      </Stack>
    </ModalFrame>
  )
}

/**
 * The window where the person pastes links to add to the list, or searches music by artist, album or song.
 *
 * A search needs an artist. Each link goes to the backend in order. A link that fails stays in the box with its message.
 * The modal closes when every link went in.
 *
 * @param props - see {@link AddSourceModalProps}.
 * @returns the modal, or nothing when closed.
 */
export function AddSourceModal ({ open, backend, onClose }: AddSourceModalProps) {
  return open ? <AddSourceForm backend={backend} onClose={onClose} /> : null
}
