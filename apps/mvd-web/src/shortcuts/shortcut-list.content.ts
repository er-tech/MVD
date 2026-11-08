import type { MenuAction } from '../backend'

/** A keyboard shortcut: the keys, what it does in words, and the menu action it triggers. */
export interface Shortcut {
  /** The keys written like `Ctrl+O`. */
  keys:   string
  /** What the shortcut does, in words for the person. */
  label:  string
  /** The action the app runs. */
  action: MenuAction
}

/** Every keyboard shortcut of the app. The shell reads it to handle keys, the shortcuts modal shows it. */
export const shortcutList: readonly Shortcut[] = [
  { keys: 'Ctrl+L', label: 'Add music', action: 'add' },
  { keys: 'Ctrl+N', label: 'New list', action: 'new-list' },
  { keys: 'Ctrl+O', label: 'Open a list', action: 'open-list' },
  { keys: 'Ctrl+S', label: 'Save the list', action: 'save-list' },
  { keys: 'Ctrl+Shift+S', label: 'Save the list as', action: 'save-list-as' },
  { keys: 'Ctrl+Enter', label: 'Start the downloads', action: 'start' },
  { keys: 'Ctrl+P', label: 'Pause or resume', action: 'pause-resume' },
  { keys: 'Ctrl+R', label: 'Retry the failed songs', action: 'retry-failed' },
  { keys: 'Ctrl+,', label: 'Preferences', action: 'preferences' },
  { keys: 'F1', label: 'Keyboard shortcuts', action: 'shortcuts' },
]
