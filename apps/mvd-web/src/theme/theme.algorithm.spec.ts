import { describe, expect, it } from 'vitest'
import { isDark, parseThemeMode } from './theme.algorithm.ts'

describe('parseThemeMode', () => {
  it('reads a kept mode, and falls back to the system for anything else', () => {
    expect(parseThemeMode('dark')).toBe('dark')
    expect(parseThemeMode('light')).toBe('light')
    expect(parseThemeMode('blue')).toBe('system')
    expect(parseThemeMode(null)).toBe('system')
  })
})

describe('isDark', () => {
  it('follows the system only in system mode', () => {
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
    expect(isDark('light', true)).toBe(false)
    expect(isDark('dark', false)).toBe(true)
  })
})
