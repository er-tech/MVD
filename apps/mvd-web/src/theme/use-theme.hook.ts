import { useEffect, useSyncExternalStore } from 'react'
import { systemQuery, themeStore } from './theme-mode.store.ts'
import type { ThemeMode } from './theme.algorithm.ts'

/**
 * The look of the page: puts it on the page, follows the system while the mode is `system`, and gives the mode and a way to change it.
 *
 * @returns the mode and a function that chooses another.
 */
export function useTheme (): { mode: ThemeMode, setMode: (mode: ThemeMode) => void } {
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.get)

  useEffect(() => {
    themeStore.refresh()
    const media = globalThis.matchMedia?.(systemQuery)
    media?.addEventListener('change', themeStore.refresh)

    return () => {
      media?.removeEventListener('change', themeStore.refresh)
    }
  }, [mode])

  return { mode, setMode: themeStore.set }
}
