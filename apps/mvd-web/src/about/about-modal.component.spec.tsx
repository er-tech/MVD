import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '../testing'
import { AboutModal } from './about-modal.component.tsx'

afterEach(cleanup)

function open () {
  const backend = fakeBackend()
  render(
    <ChakraProvider value={defaultSystem}>
      <AboutModal open backend={backend} onClose={() => undefined} />
    </ChakraProvider>,
  )

  return backend
}

describe('AboutModal', () => {
  it('shows the version from the backend', async () => {
    open()
    expect(await screen.findByText('Version 1.2.3')).toBeTruthy()
  })

  it('opens the project page', async () => {
    const backend = open()
    fireEvent.click(await screen.findByRole('button', { name: 'Open the project page' }))
    expect(backend.calls).toContain('openLink(https://github.com/er-tech/MVD)')
  })
})
