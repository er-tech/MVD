import type { Backend, Detail, ListInfo, MenuAction, PreferenceOptions, Preferences, Tools } from '../backend'
import type { Batch, State } from '../library'

/** A fake Go side for tests: it answers from what the test sets and remembers each call. */
export interface FakeBackend extends Backend {
  /** The calls made, in order, as `name(arg, ...)` text. */
  calls:            string[]
  /** Send a batch to the listeners of `onBatch`. */
  sendBatch:        (batch: Batch) => void
  /** Send a list file the system opened, to the listeners of `onOpenFile`. */
  sendOpenFile:     (path: string) => void
  /** Send the paths of files dropped on the window, to the listeners of `onFileDrop`. */
  sendFileDrop:     (paths: string[]) => void
  /** Send a menu action to the listeners of `onMenu`. */
  sendMenu:         (action: MenuAction) => void
  /** Send a close request to the listeners of `onCloseRequested`. */
  sendCloseRequest: () => void
  /** What each query answers; a test changes them. */
  answers:       {
    state:       State
    detail:      Detail
    preferences: Preferences
    options:     PreferenceOptions
    tools:       Tools
    recovery:    ListInfo | null
    version:     string
    listPath:    string
    openFile:    string
    saveFile:    string
    folder:      string
    update:      string
    updateNote:  string
    signInState: string
    signIn:      string
    move:        string
    uninstall:   string
    startupList: string
  }
  /** A message to reject the next call of the named method with, once. */
  failNext: Map<string, string>
}

const emptyState: State = {
  revision: 0,
  sources:  [],
  songs:    [],
  run:      { phase: 'empty', started: false, paused: false, sources: 0, songs: 0, done: 0, failed: 0, active: 0, speed: 0 },
}

/**
 * Make a fake backend.
 *
 * @returns the fake, ready with an empty list and ready download tools.
 */
export function fakeBackend (): FakeBackend {
  const batchListeners = new Set<(batch: Batch) => void>()
  const menuListeners = new Set<(action: MenuAction) => void>()
  const closeListeners = new Set<() => void>()
  const openFileListeners = new Set<(path: string) => void>()
  const fileDropListeners = new Set<(paths: string[]) => void>()
  const fake = {
    calls:    [],
    failNext: new Map(),
    answers:  {
      state:       emptyState,
      detail:      { kind: 'song', id: 'e0', title: 'Song', fields: [], links: [], log: [] },
      preferences: {
        outputDir:       String.raw`C:\Music`,
        videoQuality:    'best',
        audioQuality:    'best',
        outputTemplate:  '%(title)s.%(ext)s',
        maxDownloads:    4,
        officialVideo:   'yes',
        saveNotFound:    true,
        betterAudio:     false,
        autoRetry:       true,
        checkForUpdates: true,
        createLogFile:   true,

        logDir:              String.raw`C:\Music`,
        mergeFormat:         'mp4',
        retryCycles:         30,
        retryWaitSeconds:    30,
        concurrentFragments: 4,
        startTimeoutSeconds: 50,
        cookieSource:        'off',
      },
      options: {
        videoQualities: ['best', '1080p', '720p'],
        audioQualities: ['best', 'high', 'low'],
        officialVideos: ['yes', 'no', 'only'],
        minDownloads:   1,
        maxDownloads:   32,
        mergeFormats:   ['mp4', 'mkv', 'webm'],
        cookieSources:  ['off', 'firefox', 'chrome', 'all'],
        canSignIn:      false,
        canMove:        false,
        canUninstall:   false,
      },
      tools:       { ready: true, message: '', failed: false },
      recovery:    null,
      version:     '1.2.3',
      listPath:    '',
      openFile:    '',
      saveFile:    '',
      folder:      '',
      update:      'You have the newest version.',
      updateNote:  '',
      signInState: '',
      signIn:      'Signed in.',
      move:        'MVD was moved.',
      uninstall:   'MVD is being removed.',
      startupList: '',
    },
    sendBatch: (batch: Batch) => batchListeners.forEach(listener => {
      listener(batch)
    }),
    sendOpenFile: (path: string) => openFileListeners.forEach(listener => {
      listener(path)
    }),
    sendFileDrop: (paths: string[]) => fileDropListeners.forEach(listener => {
      listener(paths)
    }),
    sendMenu: (action: MenuAction) => menuListeners.forEach(listener => {
      listener(action)
    }),
    sendCloseRequest: () => closeListeners.forEach(listener => {
      listener()
    }),
  } as unknown as FakeBackend
  const answer = <T>(name: string, args: unknown[], value: () => T): Promise<T> => {
    fake.calls.push(`${name}(${args.map(String).join(', ')})`)
    const failure = fake.failNext.get(name)
    if (failure !== undefined) {
      fake.failNext.delete(name)

      return Promise.reject(new Error(failure))
    }

    return Promise.resolve(value())
  }
  const nothing = (name: string) => (...args: unknown[]): Promise<void> => answer(name, args, () => {})

  return Object.assign(fake, {
    getState: () => answer('getState', [], () => fake.answers.state),
    onBatch:  (listener: (batch: Batch) => void) => {
      batchListeners.add(listener)

      return () => batchListeners.delete(listener)
    },
    getDetail:            (kind: string, id: string) => answer('getDetail', [kind, id], () => fake.answers.detail),
    addSource:            nothing('addSource'),
    removeSource:         nothing('removeSource'),
    start:                nothing('start'),
    pause:                nothing('pause'),
    resume:               nothing('resume'),
    retryFailed:          () => answer('retryFailed', [], () => 0),
    newList:              nothing('newList'),
    openListFile:         () => answer('openListFile', [], () => fake.answers.openFile),
    openListPath:         nothing('openListPath'),
    saveList:             nothing('saveList'),
    saveListAs:           () => answer('saveListAs', [], () => fake.answers.saveFile),
    listPath:             () => answer('listPath', [], () => fake.answers.listPath),
    recovery:             () => answer('recovery', [], () => fake.answers.recovery),
    discardRecovery:      nothing('discardRecovery'),
    getPreferences:       () => answer('getPreferences', [], () => fake.answers.preferences),
    getPreferenceOptions: () => answer('getPreferenceOptions', [], () => fake.answers.options),
    setPreferences:       nothing('setPreferences'),
    pickOutputFolder:     () => answer('pickOutputFolder', [], () => fake.answers.folder),
    getTools:             () => answer('getTools', [], () => fake.answers.tools),
    version:              () => answer('version', [], () => fake.answers.version),
    checkForUpdate:       () => answer('checkForUpdate', [], () => fake.answers.update),
    updateNote:           () => answer('updateNote', [], () => fake.answers.updateNote),
    signInState:          () => answer('signInState', [], () => fake.answers.signInState),
    signIn:               () => answer('signIn', [], () => fake.answers.signIn),
    moveApp:              () => answer('moveApp', [], () => fake.answers.move),
    uninstallApp:         () => answer('uninstallApp', [], () => fake.answers.uninstall),
    startupList:          () => answer('startupList', [], () => fake.answers.startupList),
    onOpenFile:           (listener: (path: string) => void) => {
      openFileListeners.add(listener)

      return () => openFileListeners.delete(listener)
    },
    openLink:         nothing('openLink'),
    openOutputFolder: nothing('openOutputFolder'),
    quit:             nothing('quit'),
    confirmQuit:      nothing('confirmQuit'),
    onMenu:           (listener: (action: MenuAction) => void) => {
      menuListeners.add(listener)

      return () => menuListeners.delete(listener)
    },
    onFileDrop: (listener: (paths: string[]) => void) => {
      fileDropListeners.add(listener)

      return () => fileDropListeners.delete(listener)
    },
    onCloseRequested: (listener: () => void) => {
      closeListeners.add(listener)

      return () => closeListeners.delete(listener)
    },
    metric: (name: string, value: number) => {
      fake.calls.push(`metric(${name}, ${String(value)})`)
    },
  })
}
