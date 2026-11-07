import { useCallback, useState } from 'react'

/** The sizes the person gave the panes, in CSS pixels; null leaves the theme's own. */
export interface PaneSizes {
  /** The width of the sources, beside the songs. */
  sources: number | null
  /** The height of the details, under both. */
  details: number | null
}

const key = 'mvd.pane-sizes'

function read (): PaneSizes {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<PaneSizes>
    const size = (value: unknown): number | null => typeof value === 'number' && value > 0 ? value : null

    return { sources: size(stored.sources), details: size(stored.details) }
  } catch {
    return { sources: null, details: null }
  }
}

/** The sizes of the panes the person chose, kept for the next start. */
export function usePaneSizes (): [PaneSizes, (change: Partial<PaneSizes>) => void] {
  const [sizes, setSizes] = useState(read)
  const change = useCallback((next: Partial<PaneSizes>) => {
    setSizes(before => {
      const sized = { ...before, ...next }
      try { localStorage.setItem(key, JSON.stringify(sized)) } catch { /* the sizes are only not kept */ }

      return sized
    })
  }, [])

  return [sizes, change]
}
