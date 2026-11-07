import { lazy, Suspense, useEffect, useRef } from 'react'
import type { ClassicTheme } from '../classic-themes'
import { resizeWindow } from '../window-actions'
import type { ButtonSnapshot, WorkspaceIntent, WorkspaceSnapshot } from '../workspace-snapshot'
import { onProgramEvent } from './program-events.client'
import { useLiveSnapshot } from './live-snapshot.hook'
import { useWindowStyle } from './window-style.hook'

/** The event the program sends when the person closes the dialog's window by the system's means (see apps/mvd/appwindow). */
const dialogCloseEvent = 'mvd:dialog-close'

/** The width of the dialog's window, in screen points; its height is the dialog's own. */
const dialogWidth = 520

type DialogLookProps = Pick<WorkspaceSnapshot, 'adding' | 'question'> & {
  style:    string
  scheme?:  string
  onIntent: (intent: WorkspaceIntent) => void
}

// Loaded when the window opens, as it is the only thing the window shows.
const DialogLook = lazy(async () => {
  const [{ AddMusicWindow }, { QuestionWindow }, { classicThemeOf, layoutOf }, { useThemeOnRoot }] = await Promise.all([
    import('../add-music-window'),
    import('../classic-app'),
    import('../classic-themes'),
    import('../classic-window'),
  ])

  function Look ({ style, scheme, adding, question, onIntent }: DialogLookProps) {
    const theme: ClassicTheme = classicThemeOf(style)
    useThemeOnRoot(theme, scheme)
    const layout = layoutOf(theme)
    const container = document.body
    if (question) {
      return (
        <QuestionWindow
          ownWindow
          question={question}
          layout={layout}
          container={container}
          onButton={id => onIntent({ kind: 'question-button', id })}
          onText={text => onIntent({ kind: 'question-text', text })}
        />
      )
    }
    if (!adding) return null

    return (
      <AddMusicWindow
        ownWindow
        adding={adding}
        layout={layout}
        container={container}
        onMode={mode => onIntent({ kind: 'adding-mode', mode })}
        onText={(field, text) => onIntent({ kind: 'adding-text', field, text })}
        onButton={id => onIntent({ kind: 'adding-button', id })}
      />
    )
  }

  return { default: Look }
})

/** The button the system's close does: Cancel, else the default one, as Esc does in the dialog. */
function closeButton (buttons: ButtonSnapshot[] | undefined): ButtonSnapshot | undefined {
  return buttons?.find(button => button.role === 'cancel') ?? buttons?.find(button => button.role === 'default')
}

/**
 * The page of the dialog window: the program opens a window of its own for the window that adds
 * music and for each question or note, and this page fills it, in the window style the settings
 * have. It draws what the snapshot says and sends back what the person does; the program closes
 * the window when the snapshot has no dialog. The window grows or shrinks to fit the dialog.
 */
export function DialogApp () {
  const chosen = useWindowStyle()
  const [snapshot, send] = useLiveSnapshot()
  const frameRef = useRef<HTMLDivElement>(null)
  const open = snapshot !== null && chosen !== null && Boolean(snapshot.question ?? snapshot.adding)
  const closingRef = useRef<ButtonSnapshot | undefined>(undefined)
  closingRef.current = closeButton(snapshot?.question?.buttons ?? snapshot?.adding?.buttons)
  const kind = snapshot?.question ? 'question' : 'adding'

  // The system's own close (Alt+F4) is told to the program as the close box of the dialog is.
  useEffect(() => onProgramEvent(dialogCloseEvent, () => {
    const button = closingRef.current
    if (!button) return
    send({ kind: kind === 'question' ? 'question-button' : 'adding-button', id: button.id })
  }), [kind, send])

  // The window is as tall as the dialog; the page tells the window, which cannot know.
  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      const box = element.firstElementChild?.getBoundingClientRect()
      if (box && box.height > 0) resizeWindow(dialogWidth, box.height)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [open])

  if (!open || chosen === null || snapshot === null) return null

  return (
    <div ref={frameRef}>
      <Suspense>
        <DialogLook style={chosen.style} scheme={chosen.scheme || undefined} adding={snapshot.adding} question={snapshot.question} onIntent={send} />
      </Suspense>
    </div>
  )
}
