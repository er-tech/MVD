import { lazy, StrictMode, Suspense } from 'react'
import * as ReactDOM from 'react-dom/client'
import { AppWindow, DialogApp, PreferencesApp } from './app-window'
import { installProgramRuntime } from './program-runtime'

// Loaded only on its own page, so the terminal page does not carry the classic themes.
const ThemePreview = lazy(async () => {
  const { ThemePreview: page } = await import('./theme-preview')

  return { default: page }
})

installProgramRuntime()

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
)

// The page is MVD's window, in the style the preferences say; the app serves it for every path.
// /themes shows the classic themes with a sample list, to try them without the program. The
// preferences are a window of their own, which the program opens on this page with ?window=preferences,
// and so is each dialog (adding music, a question or note), with ?window=dialog.
const windowName = new URLSearchParams(location.search).get('window')
const isPreferences = windowName === 'preferences'
const isDialog = windowName === 'dialog'
const isThemes = location.pathname.replace(/\/+$/, '') === '/themes'
let page = <AppWindow />
if (isPreferences) page = <PreferencesApp />
else if (isDialog) page = <DialogApp />
else if (isThemes) page = <Suspense><ThemePreview /></Suspense>

root.render(
  <StrictMode>
    {page}
  </StrictMode>,
)
