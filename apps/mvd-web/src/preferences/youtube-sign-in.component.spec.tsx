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
  it('names the button plainly and says what it does when nothing was signed in yet', async () => {
    const backend = fakeBackend()
    shown(backend)
    expect(await screen.findByRole('button', { name: 'Sign in to YouTube…' })).toBeTruthy()
    expect(screen.getByText(/With a Premium account the music downloads at a higher quality/)).toBeTruthy()
  })

  it('names the button after what the last sign-in came to', async () => {
    const backend = fakeBackend()
    backend.answers.signInState = 'premium'
    shown(backend)
    expect(await screen.findByRole('button', { name: 'Sign in to YouTube… (signed in, Premium)' })).toBeTruthy()
  })

  it('signs in on the button and tells what came of it', async () => {
    const backend = fakeBackend()
    backend.answers.signIn = 'Signed in to YouTube.'
    shown(backend)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in to YouTube…' }))
    expect(await screen.findByText('Signed in to YouTube.')).toBeTruthy()
    expect(backend.calls).toContain('signIn()')
  })
})
