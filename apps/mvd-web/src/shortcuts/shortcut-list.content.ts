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

/** The keys of the chosen source or song, shown in the shortcuts window and the right-click menus. The page handles them where the person is not typing. */
export const itemShortcutList: readonly { keys: string, label: string }[] = [
  { keys: 'Ctrl+C', label: 'Copy the link of the chosen source, or the official video of the chosen song' },
  { keys: 'Enter', label: 'Open the link of the chosen source, or the official video of the chosen song' },
  { keys: 'Ctrl+Shift+C', label: 'Copy the original video of the chosen song' },
  { keys: 'Shift+Enter', label: 'Open the original video of the chosen song' },
  { keys: 'Ctrl+Alt+C', label: 'Copy the best audio of the chosen song' },
  { keys: 'Ctrl+Alt+Enter', label: 'Open the best audio of the chosen song' },
  { keys: 'Ctrl+Alt+Shift+C', label: 'Copy the artist and the title of the chosen song' },
  { keys: 'Delete', label: 'Remove the chosen source' },
  { keys: '↑ ↓', label: 'Choose the song above or below' },
]

/**
 * Every keyboard shortcut of the app. The shell reads it to handle keys, the shortcuts modal shows it, and
 * the native menu (apps/mvd/appmenu) writes the same keys beside its items. Cut, copy, paste and undo are
 * not here: the fields of the page handle those keys themselves.
 */
export const shortcutList: readonly Shortcut[] = [
  { keys: 'Ctrl+Shift+N', label: 'Add music', action: 'add' },
  { keys: 'Ctrl+N', label: 'New list', action: 'new-list' },
  { keys: 'Ctrl+O', label: 'Open a list', action: 'open-list' },
  { keys: 'Ctrl+S', label: 'Save the list', action: 'save-list' },
  { keys: 'Ctrl+Shift+S', label: 'Save the list as', action: 'save-list-as' },
  { keys: 'Ctrl+,', label: 'Preferences', action: 'preferences' },
  { keys: 'Ctrl+Enter', label: 'Start the downloads, or pause and resume them', action: 'start' },
  { keys: 'Ctrl+R', label: 'Retry the failed songs', action: 'retry-failed' },
  { keys: 'Ctrl+F', label: 'Search the songs', action: 'search-songs' },
  { keys: 'Ctrl+E', label: 'Open the songs folder', action: 'open-folder' },
  { keys: 'Ctrl+K', label: 'Keyboard shortcuts', action: 'shortcuts' },
  { keys: 'Ctrl+M', label: 'About MVD', action: 'about' },
  { keys: 'Ctrl+Q', label: 'Quit', action: 'quit' },
]
