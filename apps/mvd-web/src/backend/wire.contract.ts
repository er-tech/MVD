/** A fact about the selected item: a label and its value. */
export interface DetailField {
  label: string
  value: string
}

/** An address with the words that say what it leads to. */
export interface DetailLink {
  label: string
  url:   string
}

/** All the details panel shows for the selected source or song. Go decides what is worth saying. */
export interface Detail {
  kind:   'source' | 'song'
  id:     string
  title:  string
  fields: DetailField[]
  links:  DetailLink[]
  log:    string[]
}

/** The settings of the Preferences window. */
export interface Preferences {
  outputDir:           string
  videoQuality:        string
  audioQuality:        string
  outputTemplate:      string
  maxDownloads:        number
  officialVideo:       string
  saveNotFound:        boolean
  betterAudio:         boolean
  autoRetry:           boolean
  checkForUpdates:     boolean
  createLogFile:       boolean
  /** The folder the log is written to. */
  logDir:              string
  /** The kind of video file made, one of `PreferenceOptions.mergeFormats`. */
  mergeFormat:         string
  /** How many times a failed download is tried again before it is given up. */
  retryCycles:         number
  /** The wait before the first retry, times the number of the attempt. */
  retryWaitSeconds:    number
  /** How many parts of a video come at once, 0 for one at a time. */
  concurrentFragments: number
  /** How long a download may take to start before it is stopped. */
  startTimeoutSeconds: number
  /** Where the YouTube login comes from, one of `PreferenceOptions.cookieSources`. */
  cookieSource:        string
}

/** The choices of the fields that offer a list. */
export interface PreferenceOptions {
  videoQualities: string[]
  audioQualities: string[]
  officialVideos: string[]
  minDownloads:   number
  maxDownloads:   number
  mergeFormats:   string[]
  cookieSources:  string[]
  /** Which actions this system offers. */
  canSignIn:      boolean
  canMove:        boolean
  canUninstall:   boolean
}

/** Whether the tools of the downloads are ready. */
export interface Tools {
  ready:   boolean
  /** What is going on, or what went wrong, `` when ready. */
  message: string
  failed:  boolean
}

/** A list file the last run left, waiting to be taken up again. */
export interface ListInfo {
  path:    string
  sources: number
  songs:   number
}

/** What a menu item of the window asks the page to do. */
export type MenuAction =
  | 'add' |
  'new-list' |
  'open-list' |
  'save-list' |
  'save-list-as' |
  'start' |
  'pause-resume' |
  'retry-failed' |
  'open-folder' |
  'preferences' |
  'shortcuts' |
  'about' |
  'quit' |
  'undo' |
  'redo' |
  'cut' |
  'copy' |
  'paste'
