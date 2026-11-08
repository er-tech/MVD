import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '../testing'
import { YouTubeSignIn } from './youtube-sign-in.component.tsx'

afterEach(cleanup)

const shown = (backend: ReturnType<typeof fakeBackend>) => render(
  <ChakraProvider value={defaultSystem}>
    <YouTubeSignIn backend={backend} />
  </ChakraProvider>,
)

describe('YouTubeSignIn', () => {
  it('shows nothing where signing in is not offered', async () => {
    const backend = fakeBackend()
    shown(backend)
    await screen.findByText('', { selector: 'body' })
    expect(screen.queryByText('Sign in to YouTube')).toBeNull()
  })

  it('shows the state and signs in on the button', async () => {
    const backend = fakeBackend()
    backend.answers.signInState = 'not signed in'
    backend.answers.signIn = 'Signed in to YouTube.'
    shown(backend)
    expect(await screen.findByText('YouTube: not signed in')).toBeTruthy()
    fireEvent.click(screen.getByText('Sign in to YouTube'))
    expect(await screen.findByText('Signed in to YouTube.')).toBeTruthy()
    expect(backend.calls).toContain('signIn()')
  })
})
