import { Box, Menu, Portal } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import type { MenuEntry } from './menu-entry.contract.ts'

/** The props of {@link ContextMenu}. */
export interface ContextMenuProps {
  /** The area that answers a right click. Each item in it carries a `data-id`. */
  children:   ReactNode
  /** The entries for the item with this ID. It may ask the Go side, so it can take a moment. */
  entriesFor: (id: string) => Promise<MenuEntry[]>
  /** Called with the ID of the item that was right-clicked, before the menu shows. */
  onTarget?:  (id: string) => void
  /** Passed to the area, for example to make it fill its place. */
  flex?:      string
  minH?:      string
}

/**
 * Wraps an area so that a right click on one of its items (an element with a `data-id`) opens a menu for
 * that item. A right click on empty space opens nothing.
 *
 * @param props - see {@link ContextMenuProps}.
 */
export function ContextMenu ({ children, entriesFor, onTarget, flex, minH }: ContextMenuProps) {
  const [target, setTarget] = useState<string | undefined>()
  const [loaded, setLoaded] = useState<{ id: string, entries: MenuEntry[] }>({ id: '', entries: [] })

  useEffect(() => {
    if (target === undefined) return
    let current = true
    const load = async () => {
      try {
        const found = await entriesFor(target)
        if (current) setLoaded({ id: target, entries: found })
      } catch {
        if (current) setLoaded({ id: target, entries: [] })
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [target, entriesFor])

  const choose = (event: MouseEvent<HTMLElement>) => {
    const id = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-id]')?.dataset.id : undefined
    if (id === undefined) {
      // Nothing to act on: no menu, and not the browser's own either.
      event.preventDefault()
      event.stopPropagation()

      return
    }
    setTarget(id)
    onTarget?.(id)
  }

  return (
    <Menu.Root>
      <Menu.ContextTrigger asChild>
        <Box onContextMenuCapture={choose} flex={flex} minH={minH} display='flex' flexDirection='column'>
          {children}
        </Box>
      </Menu.ContextTrigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW='14rem'>
            {(loaded.id === target ? loaded.entries : []).map(entry => (
              <Box key={entry.key}>
                {entry.separatorBefore === true && <Menu.Separator />}
                <Menu.Item value={entry.key} disabled={entry.disabled} onSelect={entry.run}>
                  {entry.label}
                  {entry.shortcut !== undefined && <Menu.ItemCommand>{entry.shortcut}</Menu.ItemCommand>}
                </Menu.Item>
              </Box>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
