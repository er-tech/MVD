/** One line of a right-click menu. */
export interface MenuEntry {
  key:              string
  label:            string
  /** The keys that do the same, written like `Ctrl+C`. */
  shortcut?:        string
  run:              () => void
  disabled?:        boolean
  /** Draw a line above the entry, to set a group apart. */
  separatorBefore?: boolean
}
