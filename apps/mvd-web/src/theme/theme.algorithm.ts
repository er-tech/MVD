/** How the page looks: a fixed light or dark, or whatever the system uses. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** The modes in the order they are offered. */
export const themeModes: readonly ThemeMode[] = ['light', 'dark', 'system']

/**
 * The mode kept from an earlier run.
 *
 * @param stored - the text that was kept, or `null` when none was.
 * @returns the mode, or `system` when the text is not a mode.
 */
export function parseThemeMode (stored: string | null): ThemeMode {
  return themeModes.find(mode => mode === stored) ?? 'system'
}

/**
 * Whether the page is dark for a mode.
 *
 * @param mode - the mode the person chose.
 * @param systemDark - whether the system asks for dark.
 */
export function isDark (mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}
