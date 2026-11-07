/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- a focusable window splitter, as the ARIA authoring practices have it */
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'

interface PaneSplitterProps {
  /** A vertical bar sizes the sources beside the songs; a horizontal one sizes the details under them. */
  orientation: 'vertical' | 'horizontal'
  /** The element that holds the panes, to measure them. */
  panes:       RefObject<HTMLElement | null>
  onSize:      (px: number) => void
}

/** What a pane keeps: the smallest it can be made, and the room the panes beside it keep. */
const limits = { sources: 160, songs: 240, listsRow: 120, details: 60, step: 16, edges: 18 }

/** The arrow keys of each bar and which way they size the pane: the details grow upwards. */
const widen: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
const heighten: Record<string, number> = { ArrowUp: 1, ArrowDown: -1 }

/** The page's zoom, which a bitmap theme sets to stay sharp: a pointer moves in screen pixels. */
const pageZoom = (): number => Number(getComputedStyle(document.documentElement).getPropertyValue('--pixel-zoom')) || 1

/**
 * The bar between two panes. Drag it, or press the arrow keys on it, to size the pane before it
 * (the sources) or after it (the details). It draws nothing itself; the gap it sits in is the
 * theme's.
 */
export function PaneSplitter ({ orientation, panes, onSize }: PaneSplitterProps) {
  const vertical = orientation === 'vertical'

  /** The pane the bar sizes, and the most it can grow to. */
  const measure = (): { size: number, min: number, max: number } | null => {
    const box = panes.current
    const pane = box?.querySelector<HTMLElement>(vertical ? '.classic-sources' : '.classic-details')
    if (!box || !pane) return null

    return vertical
      ? { size: pane.offsetWidth, min: limits.sources, max: box.clientWidth - limits.edges - limits.songs }
      : { size: pane.offsetHeight, min: limits.details, max: box.clientHeight - limits.edges - limits.listsRow }
  }

  const resize = (from: number, by: number, room: { min: number, max: number }): void => {
    const most = Math.max(room.min, room.max)
    const size = Math.min(Math.max(from + by, room.min), most)
    onSize(Math.round(size))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const room = measure()
    if (!room || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    const start = vertical ? event.clientX : event.clientY
    const zoom = pageZoom()
    const move = (next: globalThis.PointerEvent): void => {
      const moved = ((vertical ? next.clientX : next.clientY) - start) / zoom
      resize(room.size, vertical ? moved : -moved, room) // the details grow upwards
    }
    const stop = (): void => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', stop)
      removeEventListener('pointercancel', stop)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', stop)
    addEventListener('pointercancel', stop)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const room = measure()
    const toward = (vertical ? widen : heighten)[event.key]
    if (!room || toward === undefined) return
    event.preventDefault()
    resize(room.size, toward * limits.step, room)
  }

  return (
    <div
      className='classic-splitter'
      data-orientation={orientation}
      role='separator'
      aria-orientation={orientation}
      aria-label={vertical ? 'Resize the sources' : 'Resize the details'}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  )
}
