import { useEffect, useState } from 'react'
import type { Backend, Tools } from '../backend'

/** How often the tools are looked at while they are fetched, in milliseconds. */
const pollEvery = 500

const waiting: Tools = { ready: false, message: 'Starting…', failed: false }

/**
 * The state of the download tools. It asks again while they are fetched and stops once they are ready
 * or one failed, which does not change.
 *
 * @param backend - the Go side.
 * @returns the state of the tools.
 */
export function useTools (backend: Backend): Tools {
  const [tools, setTools] = useState<Tools>(waiting)

  useEffect(() => {
    let current = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const look = async (): Promise<void> => {
      try {
        const next = await backend.getTools()
        if (!current) {
          return
        }
        setTools(next)
        if (!next.ready && !next.failed) {
          timer = setTimeout(() => {
            void look()
          }, pollEvery)
        }
      } catch (error) {
        if (current) {
          setTools({ ready: false, message: error instanceof Error ? error.message : String(error), failed: true })
        }
      }
    }
    void look()

    return () => {
      current = false
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }, [backend])

  return tools
}
