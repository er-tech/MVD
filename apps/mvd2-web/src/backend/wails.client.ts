import type { Batch, State } from '../rowstore'
import type { Backend } from './backend.contract.ts'

interface WailsWindow {
  go: {
    bridge: {
      App: {
        GetState: () => Promise<State>
        Metric:   (name: string, value: number) => Promise<void>
      }
    }
  }
  runtime: { EventsOn: (name: string, callback: (batch: Batch) => void) => () => void }
}

/**
 * The backend as Wails binds it: methods on `window.go` and events on `window.runtime`.
 *
 * @param target - the window that holds the Wails bindings.
 * @returns the backend the page uses.
 */
export function wailsBackend (target: object = globalThis): Backend {
  const wails = target as unknown as WailsWindow

  return {
    getState: () => wails.go.bridge.App.GetState(),
    onRows:   listener => wails.runtime.EventsOn('rows', listener),
    metric:   (name, value) => {
      void wails.go.bridge.App.Metric(name, value)
    },
  }
}
