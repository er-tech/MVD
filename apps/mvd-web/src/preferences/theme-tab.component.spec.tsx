import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeTab } from './theme-tab.component.tsx'

afterEach(cleanup)

describe('ThemeTab', () => {
  it('offers light, dark and system, and puts the choice on the page and keeps it', async () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <ThemeTab />
      </ChakraProvider>,
    )
    expect(screen.getAllByRole('radio').map(radio => radio.closest('label')?.textContent)).toEqual([
      expect.stringContaining('Light'),
      expect.stringContaining('Dark'),
      expect.stringContaining('System'),
    ])
    fireEvent.click(screen.getByLabelText(/^Dark/))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(localStorage.getItem('mvd-theme')).toBe('dark')
    fireEvent.click(screen.getByLabelText(/^Light/))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
    expect(localStorage.getItem('mvd-theme')).toBe('light')
  })
})
