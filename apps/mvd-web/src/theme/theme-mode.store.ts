import { isDark, parseThemeMode } from './theme.algorithm.ts'
import type { ThemeMode } from './theme.algorithm.ts'

const storageKey = 'mvd-theme'

/** The media query that tells when the system changes its look. */
export const systemQuery = '(prefers-color-scheme: dark)'

const systemDark = (): boolean => globalThis.matchMedia?.(systemQuery).matches ?? false

function kept (): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(storageKey))
  } catch {
    return 'system'
  }
}

/** Put the look on the page: the class Chakra reads, and the colour scheme of the scroll bars and fields. */
function apply (mode: ThemeMode): void {
  const dark = isDark(mode, systemDark())
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

let current = kept()
const listeners = new Set<() => void>()

/** The look of the page, kept between runs in the window's own storage. */
export const themeStore = {
  /** The mode the person chose. */
  get: (): ThemeMode => current,
  /** Choose a mode: the page changes at once and the choice is kept. */
  set: (mode: ThemeMode): void => {
    current = mode
    try {
      localStorage.setItem(storageKey, mode)
    } catch {
      // A window without storage still shows the choice, for this run.
    }
    apply(mode)
    listeners.forEach(listener => {
      listener()
    })
  },
  /** Put the current mode on the page, for example when the system's choice changed. */
  refresh: (): void => {
    apply(current)
  },
  /** Listen to changes of the mode. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener)

    return () => listeners.delete(listener)
  },
}
