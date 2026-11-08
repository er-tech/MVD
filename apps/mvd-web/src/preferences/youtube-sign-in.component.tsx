import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { fieldText, signInLabel } from './preference-fields.content.ts'

/**
 * The YouTube sign-in of Preferences: a button that opens the window to sign in, named after what the
 * last sign-in came to, with the line that says what it does. The caller shows it only where the system
 * offers signing in.
 *
 * @param props.backend - the Go side.
 */
export function YouTubeSignIn ({ backend }: { backend: Backend }) {
  const [state, setState] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let current = true
    const load = async () => {
      try {
        const value = await backend.signInState()
        if (current) setState(value)
      } catch {
        // No news of an earlier sign-in: the button keeps its plain name.
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [backend])

  const signIn = async () => {
    setWorking(true)
    try {
      setMessage(await backend.signIn())
      setState(await backend.signInState())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Stack gap='1'>
      <Button variant='outline' loading={working} onClick={() => void signIn()}>{signInLabel(state)}</Button>
      <Text fontSize='xs' color='fg.muted'>{message === '' ? fieldText.signIn.hint : message}</Text>
    </Stack>
  )
}
