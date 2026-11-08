import type { Batch } from '../library'
import type { Backend } from './backend.contract.ts'
import type { MenuAction } from './wire.contract.ts'

type Call = (...args: unknown[]) => Promise<unknown>

interface WailsWindow {
  go:      { bridge: { App: Record<string, Call> } }
  runtime: { EventsOn: (name: string, callback: (...data: never[]) => void) => () => void }
}

/**
 * The backend as Wails binds it: methods on `window.go` and events on `window.runtime`. A Go error
 * comes back as a rejected string, so each call turns it into an `Error`.
 *
 * @param target - the window that holds the Wails bindings.
 * @returns the backend the page uses.
 */
export function wailsBackend (target: object = globalThis): Backend {
  const wails = target as unknown as WailsWindow
  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    try {
      return await wails.go.bridge.App[method](...args) as T
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
  const on = <T>(event: string, listener: (data: T) => void): (() => void) =>
    wails.runtime.EventsOn(event, listener)

  return {
    getState:             () => call('GetState'),
    onBatch:              listener => on<Batch>('rows', listener),
    getDetail:            (kind, id) => call('GetDetail', kind, id),
    addSource:            url => call('AddSource', url),
    removeSource:         id => call('RemoveSource', id),
    start:                () => call('Start'),
    pause:                () => call('Pause'),
    resume:               () => call('Resume'),
    retryFailed:          () => call('RetryFailed'),
    newList:              () => call('NewList'),
    openListFile:         () => call('OpenListFile'),
    openListPath:         path => call('OpenListPath', path),
    saveList:             () => call('SaveList'),
    saveListAs:           () => call('SaveListAs'),
    listPath:             () => call('ListPath'),
    recovery:             () => call('Recovery'),
    discardRecovery:      () => call('DiscardRecovery'),
    getPreferences:       () => call('GetPreferences'),
    getPreferenceOptions: () => call('GetPreferenceOptions'),
    setPreferences:       preferences => call('SetPreferences', preferences),
    pickOutputFolder:     () => call('PickOutputFolder'),
    getTools:             () => call('GetTools'),
    version:              () => call('Version'),
    openLink:             url => call('OpenLink', url),
    openOutputFolder:     () => call('OpenOutputFolder'),
    quit:                 () => call('Quit'),
    confirmQuit:          () => call('ConfirmQuit'),
    onMenu:               listener => on<MenuAction>('menu', listener),
    onCloseRequested:     listener => on<undefined>('close-requested', () => {
      listener()
    }),
    metric: (name, value) => {
      void call('Metric', name, value)
    },
  }
}
