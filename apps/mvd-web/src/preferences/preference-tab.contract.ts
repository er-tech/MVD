import type { Backend, PreferenceOptions, Preferences } from '../backend'

/** What each tab of the Preferences window is given. */
export interface PreferenceTabProps {
  /** The values being edited. */
  values:  Preferences
  /** The choices and limits of the fields. */
  options: PreferenceOptions
  /** Put new values in the ones being edited. */
  change:  (patch: Partial<Preferences>) => void
  /** The Go side, for the tabs that ask it to do something. */
  backend: Backend
  /** Show what went wrong. */
  fail:    (error: unknown) => void
}
