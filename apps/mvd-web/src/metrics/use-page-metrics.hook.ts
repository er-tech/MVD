import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { takeRowDraws } from './redraw-counter.store.ts'

/** What the page measured in the last period. */
export interface PageMetrics {
  /** Tasks on the main thread longer than 50 ms. */
  longTasks: number
  /** The longest of them, in milliseconds. */
  longestMs: number
  /** Rows drawn per second. */
  rowDraws:  number
}

const period = 2000

/**
 * Measure the page and send the numbers to the Go side's log every two seconds: the long tasks of
 * the main thread and the rows drawn each second. These are the budgets of the rewrite.
 *
 * @param backend - where to record the numbers.
 * @returns the numbers of the last period, for the screen.
 */
export function usePageMetrics (backend: Backend): PageMetrics {
  const [metrics, setMetrics] = useState<PageMetrics>({ longTasks: 0, longestMs: 0, rowDraws: 0 })

  useEffect(() => {
    let longTasks = 0
    let longest = 0
    const observer = typeof PerformanceObserver === 'undefined'
      ? undefined
      : new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            longTasks++
            longest = Math.max(longest, entry.duration)
          }
        })
    try {
      observer?.observe({ entryTypes: ['longtask'] })
    } catch {
      // The web view has no long task entries: the count stays 0.
    }
    const timer = setInterval(() => {
      const next = { longTasks, longestMs: Math.round(longest), rowDraws: Math.round(takeRowDraws() / (period / 1000)) }
      longTasks = 0
      longest = 0
      setMetrics(next)
      backend.metric('longTasks', next.longTasks)
      backend.metric('longestMs', next.longestMs)
      backend.metric('rowDrawsPerSecond', next.rowDraws)
    }, period)

    return () => {
      clearInterval(timer)
      observer?.disconnect()
    }
  }, [backend])

  return metrics
}
