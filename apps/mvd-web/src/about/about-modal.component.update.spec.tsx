import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '../testing'
import { AboutModal } from './about-modal.component.tsx'

afterEach(cleanup)

describe('AboutModal updates', () => {
  it('shows the note of a newer version and the answer of a check', async () => {
    const backend = fakeBackend()
    backend.answers.updateNote = 'Version 1.3 is ready.'
    backend.answers.update = 'You have the newest version.'
    render(
      <ChakraProvider value={defaultSystem}>
        <AboutModal open backend={backend} onClose={() => undefined} />
      </ChakraProvider>,
    )
    expect(await screen.findByText('Version 1.3 is ready.')).toBeTruthy()
    fireEvent.click(screen.getByText('Check for updates'))
    expect(await screen.findByText('You have the newest version.')).toBeTruthy()
    expect(backend.calls).toContain('checkForUpdate()')
  })
})
