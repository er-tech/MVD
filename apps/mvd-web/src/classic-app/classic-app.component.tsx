import { useCallback, useMemo, type ReactNode } from 'react'
import { AddMusicWindow } from '../add-music-window'
import type { ClassicTheme } from '../classic-themes'
import { DetailsPane, SongsTable, SourcesPane, type SourceAction } from '../classic-panes'
import { ClassicWindow } from '../classic-window'
import type { MenuSnapshot, WorkspaceIntent, WorkspaceSnapshot } from '../workspace-snapshot'
import { useKeyboardIntents } from './keyboard-intents.hook'
import { QuestionWindow } from './question-window.component'

interface ClassicAppProps {
  theme:           ClassicTheme
  /** The theme's colour scheme; none for its first, the system's own. */
  scheme?:         string
  snapshot:        WorkspaceSnapshot
  onIntent:        (intent: WorkspaceIntent) => void
}

/** The Edit menu's entries that act on the source chosen, by their label, as its own menu calls them. */
const sourceEntries = new Map([['Delete', 'Remove source'], ['Move up', 'Move up'], ['Move down', 'Move down']])

/** What a source's own menu offers: the Edit menu's entries for it, as the program enables them. */
function sourceActions (menus: MenuSnapshot[]): SourceAction[] {
  const edit = menus.find(menu => menu.label === 'Edit')?.entries ?? []

  return edit
    .filter(entry => sourceEntries.has(entry.label))
    .map(entry => ({ id: entry.id, label: sourceEntries.get(entry.label) ?? entry.label, enabled: entry.enabled }))
}

/**
 * MVD's main window in a classic theme, whole: the window with its sources, songs and details,
 * the window for adding music when it is open, and a dialog the terminal shows through for a
 * screen the themes do not draw yet. It draws what the snapshot says and sends back what the
 * person does; MVD decides the rest.
 */
export function ClassicApp ({ theme, scheme, snapshot, onIntent }: ClassicAppProps) {
  const { adding, question } = snapshot
  useKeyboardIntents(snapshot.menus, onIntent, !adding && !question)
  // The panes redraw only when what they are given changes, so what is given must stay the same between snapshots.
  const actions = useMemo(() => sourceActions(snapshot.menus), [snapshot.menus])
  const selectSource = useCallback((index: number) => onIntent({ kind: 'select-source', index }), [onIntent])
  const runMenu = useCallback((id: string) => onIntent({ kind: 'menu', id }), [onIntent])
  const selectSong = useCallback((index: number) => onIntent({ kind: 'select-song', index }), [onIntent])
  const tickSong = useCallback((index: number, ticked: boolean) => onIntent({ kind: 'tick-song', index, ticked }), [onIntent])

  return (
    <>
      <ClassicWindow
        theme={theme}
        scheme={scheme}
        snapshot={snapshot}
        onIntent={onIntent}
        overlay={(container, layout): ReactNode => question
          ? (
              <QuestionWindow
                question={question}
                layout={layout}
                container={container}
                onButton={id => onIntent({ kind: 'question-button', id })}
                onText={text => onIntent({ kind: 'question-text', text })}
              />
            )
          : adding && (
            <AddMusicWindow
              adding={adding}
              layout={layout}
              container={container}
              onMode={mode => onIntent({ kind: 'adding-mode', mode })}
              onText={(field, text) => onIntent({ kind: 'adding-text', field, text })}
              onButton={id => onIntent({ kind: 'adding-button', id })}
            />
          )}
      >
        <SourcesPane
          sources={snapshot.sources}
          onSelect={selectSource}
          actions={actions}
          onAction={runMenu}
        />
        <SongsTable songs={snapshot.songs} onSelect={selectSong} onTick={tickSong} />
        <DetailsPane details={snapshot.details} />
      </ClassicWindow>
    </>
  )
}
