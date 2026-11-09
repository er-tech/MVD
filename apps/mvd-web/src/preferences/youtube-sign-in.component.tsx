import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { fieldText, signInLabel } from './preference-fields.content.ts'

const phaseText = { idle: '', window: 'Waiting for you to sign in…', checking: 'Checking your login…' }
const phaseNote = {
  idle:     '',
  window:   'A sign-in window is open, maybe behind this one. Sign in there, then close it.',
  checking: 'Reading what your login gives. This can take up to a minute.',
}

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
  // `window` while the person signs in in the window MVD opened, `checking` while MVD reads what the login gives.
  const [phase, setPhase] = useState<'idle' | 'window' | 'checking'>('idle')
  const working = phase !== 'idle'

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
    setPhase('window')
    try {
      setMessage(await backend.signIn())
      setPhase('checking')
      setState(await backend.signInState())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setPhase('idle')
    }
  }

  return (
    <Stack gap='1'>
      <Button variant='outline' loading={working} loadingText={phaseText[phase]} onClick={() => void signIn()}>{signInLabel(state)}</Button>
      <Text fontSize='xs' color='fg.muted'>{working ? phaseNote[phase] : (message === '' ? fieldText.signIn.hint : message)}</Text>
    </Stack>
  )
}
