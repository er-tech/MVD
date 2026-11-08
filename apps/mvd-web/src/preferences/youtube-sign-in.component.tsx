import { Button, HStack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend } from '../backend'

/**
 * The line of the YouTube sign-in in Preferences: whether a login is kept and a button to sign in
 * inside the app. It shows nothing where the system does not offer signing in.
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
        if (current) {
          setState(value)
        }
      } catch {
        // Not offered here: the row stays hidden.
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [backend])

  if (state === '') {
    return null
  }

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
    <HStack justify='space-between' align='start'>
      <Text fontSize='sm'>{message === '' ? `YouTube: ${state}` : message}</Text>
      <Button size='sm' variant='outline' loading={working} onClick={() => void signIn()}>Sign in to YouTube</Button>
    </HStack>
  )
}
