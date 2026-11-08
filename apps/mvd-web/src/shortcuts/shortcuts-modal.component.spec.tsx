import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { shortcutList } from './shortcut-list.content.ts'
import { ShortcutsModal } from './shortcuts-modal.component.tsx'

afterEach(cleanup)

describe('ShortcutsModal', () => {
  it('shows every shortcut with its keys', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <ShortcutsModal open onClose={() => undefined} />
      </ChakraProvider>,
    )
    const table = within(screen.getByRole('table'))
    for (const shortcut of shortcutList) {
      expect(table.getByText(shortcut.label)).toBeTruthy()
      expect(table.getByText(shortcut.keys)).toBeTruthy()
    }
  })

  it('gives each shortcut its own keys and action', () => {
    expect(new Set(shortcutList.map(shortcut => shortcut.keys)).size).toBe(shortcutList.length)
    expect(new Set(shortcutList.map(shortcut => shortcut.action)).size).toBe(shortcutList.length)
  })
})
