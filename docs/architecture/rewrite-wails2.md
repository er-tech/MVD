# Rewrite: a new window on Wails 2

Status: built on the branch `rewrite` (2026-11-08), not merged. Decided with the user on 2026-11-07. Epic: see PROGRESS.md.

## Why

The window is slow and unreliable. The cause is the way it talks to the Go core, not Wails or React.

- The core is a Bubble Tea clone: one model and one message queue. Each message runs the whole loop.
- Each loop turns the whole model into a full snapshot (every song row, every menu, every label),
  runs `json.Marshal` on it and sends it to the page.
- The page replaces its state with each snapshot, so React has nothing small to update.
- A pacer (0.20.1) hides the cost. It does not remove it.
- The close goes through the same queue, so it can wait behind work.

A TUI has to redraw the whole screen. A page does not.

## Decisions

1. **Remove the old window.** `apps/mvd-web`, `apps/mvd/appwindow` and the snapshot contract go away
   at the cutover. The old screens are a reference for what each screen holds. No code is reused.
2. **Wails 2.** Wails 3 is a beta. Wails 2 is stable and has native menus. It has one window only, so
   Add music, Preferences, About, the shortcuts and every question become Chakra modals in the page.
3. **React 19 and Chakra UI** for the page.
4. **The engine stays.** yt-dlp, official-video search, the download queue, the list files and the
   recovery file are not the cause. Only the layer between them and the page is new.
5. **MonoSmith** creates and builds the projects. Vertical slices in Go and in TypeScript.
6. **The old app keeps releasing** until the new one does everything it does. One change then
   deletes the old window and the old message queue.

## The way Go and the page talk

Wails 2 gives two tools: bound Go methods (typed TypeScript is generated) and events.

**Go owns the state.** One `store` holds the sources, the songs, the run state and the preferences.
It has a mutex and a revision number that grows with each change. The engine writes to the store.
Nothing else holds state, and there is no message queue.

**Commands are bound methods.** The page calls `AddSource(url)`, `RemoveSource(id)`, `Start()`,
`Stop()`, `OpenList(path)`, `SaveList(path)`, `SetPreference(key, value)` and the like. Each returns at
once with a result or a typed error. Slow work goes to the engine and the call does not wait for it.

**Queries are bound methods.** `GetState()` returns the whole state and its revision, once, when the
page starts or resyncs. `GetDetails(kind, id)` returns the detail of one source or song.

**Changes are a few events, small and typed.**

| Event | Carries | When |
|---|---|---|
| `sources` | added, changed and removed sources | a source changes |
| `songs` | added, changed and removed song rows by ID | a row changes |
| `progress` | `{id, percent, speed}` for the rows in view | at most 4 times a second |
| `run` | idle, loading, downloading, counts | the run state changes |
| `selection-details` | the detail of the selected item | the item changes |

Each event carries the revision it leads to. The store gathers the changes and a flush loop sends
them at most every 100 ms, and only when something changed. A flush with nothing to say sends nothing.

**The page checks the revision.** If an event does not follow the last one it has, the page calls
`GetState()` and starts again. So a file that loads twice shows the same list twice, or the page
resyncs. This is the test for "what I see is what was saved".

## The page

- A keyed store (`useSyncExternalStore` or Zustand): a map of rows by ID. A component for a row
  subscribes to that row only, so a changed row is the only one drawn.
- The songs table is virtual (TanStack Virtual): only the visible rows exist.
- A row never moves by itself. The order changes when the user sorts, not when data arrives.
- The selection is a state of the page, so an event does not change it.
- Chakra modals: Add music, Preferences, About, Keyboard shortcuts, Quit, and a line to write.
- Native menus come from the Wails 2 menu API and call the same bound methods.

## The screens (from the old app and the four steps)

1. Add a source: a playlist, a song or a file.
2. The app starts to load each playlist at once: artist, video and the rest.
3. The details panel follows the selection.
   - A playlist: all its information and a link to it.
   - A song: all details and links (the video in the playlist, the official video found, the best
     audio found).
4. **Start** downloads the songs that are ready while the loading goes on.

Also: the sources list, the songs table with status and version, the footer with the counts, the
recovery question at start, Preferences, About, the shortcuts and the quit question.

## Close

`OnBeforeClose` cancels one context. The engine stops each yt-dlp process and its children, and the
window closes when they stop or after 2 seconds, whichever is first. A test starts a download, closes
and checks that no process remains.

## Folders (proposed)

- `apps/mvd`: the Wails 2 shell (`bridge`, `runhost`, `preferences`, `appmenu`, `childprocs`) and the platform code.
- `libs/mvd-core/...`: the engine, as today.
- `libs/mvd-state` (new): the store, the revisions, the flush loop and the event shapes.
- `apps/mvd-web`: the page, in vertical slices.

## Phases

0. **Prototype:** a Wails 2 window with 5,000 rows that change live, one running download, and a close.
   It must pass the budgets below before anything else.
1. The store, the bound methods and the events, with tests and no page.
2. The page shell, the sources list and the virtual songs table.
3. The details panel.
4. Start and downloads.
5. The modals, Preferences and the native menus.
6. Packaging for Windows, Mac and Linux, signing and the updater (the updater logic is core, not UI).
7. The cutover: delete the old window and the old message queue.

## Budgets (the prototype and each phase must meet them)

- No task on the page main thread longer than 50 ms while 5,000 rows change.
- A click on a row shows the selection in under 100 ms during a load.
- Close, with a download running, ends in under 2 seconds with no process left.
- The same saved file, loaded 10 times, gives the same list 10 times.
- With nothing changing, the Go process and the page use about no CPU.

## Risks

- **Wails 2 has one window.** Modals must do all that the windows did. We accept this.
- **No updater in Wails 2.** We keep the core's updater and write the small UI around it.
- **Packaging.** The Wails 2 build needs its own CLI. We must decide how MonoSmith runs it.
- **Mac and Linux.** The prototype runs on Windows first. The Mac and Linux checks come in phase 6.
