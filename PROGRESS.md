# Progress: rewrite the window on Wails 2

Epic: #480 (supersedes #479). Design: `docs/architecture/rewrite-wails2.md`.

Released before the rewrite: 0.20.1 (update pace, #474), 0.20.2 (planned songs, #474), 0.21.0 (Add source,
About and every question in a window of their own, #467). #471 was closed: not reproducible.

## Phases

0. Prototype: 5,000 live rows, a stand-in child program, a clean close. **Done** (2026-11-08, Windows).
   Result: 10,000 row changes a second gave 0 long tasks, about 60 rows drawn a second (only the rows in
   view that changed), 14% of one core for the app and its web view together, and a close in 31 ms with no
   process left. A clicked row stayed selected while the data changed. Not yet measured: Mac and Linux, a
   real yt-dlp child, the time from click to selection.
   The prototype code was replaced in phase 1 and 2.
1. Store, bound methods and events. **Done** (2026-11-08). `libs/mvd-state/library` holds sources, songs and
   the run state under one revision. `apps/mvd/runhost` is the session: it lists each link at once, holds what
   it finds, and after Start releases each ready song while loading goes on. The engine blocks a sender while
   its event channel is full, so no call to the engine happens under the lock the pump needs (race tests).
2. Page shell and virtual table. **Done.** `apps/mvd-web`: library, librarysync, sourcelist, songtable,
   toolbar, statusbar, app.
3. Details panel. **Done.** Go builds the fields and links (the video in the playlist, the official video
   found, the best audio found); the page asks again at most every 300 ms while the item changes.
4. Start and downloads. **Done.** Checked in the real window: a link lists, the official video is found, the
   song waits, Start downloads. A close with a download running asks first, then ends in about 2 s with no
   yt-dlp or ffmpeg left (a Windows job object).
5. Modals, Preferences, menus. **Done.** Add, Preferences (with the YouTube sign-in), About (with the update
   check), shortcuts, recovery, quit question; native menu; keys and menu end in one function.
6. Packaging and updater. **Done for Windows.** smith builds with the `desktop,production` tags and stages the
   page into `apps/mvd/frontend/dist`. The self-update, tool updates, move offer, file type and uninstall
   code of the old app is kept. **Not verified:** Mac and Linux builds, the DMG, signing.
7. Cutover. **Done on the branch `rewrite`; not merged.** `apps/mvd` is the Wails 2 app, `apps/mvd-web` the page.
   The old window, its page, the Bubble Tea clone, the workspace and the screen models are deleted.

Known leftovers: `apps/mvd/signin` still uses Wails 3 for its own small window (a separate process), so the
root module carries both. `smith slices check` reports old file names in `apps/mvd` and `libs/mvd-core` that
were there before (`*_other.go`, `*_fixtures_test.go`). A list opened from a file shows the songs not yet
downloaded, as the old window did.

## Decisions

- Wails 2 (stable, native menus, one window): modals replace the separate windows.
- Go owns the state; the page gets bound methods and small events that carry a revision.
- The old app keeps releasing until parity. No old UI code is reused.

---

# Progress: remove the terminal (TUI) interface

Epic: #448. Performance fixes that came first: #447.

## Why

The window is drawn by the page from snapshots, but the app model was a Bubble Tea program that ran
only while a hidden xterm in the page was connected. The terminal rendered ANSI frames nobody saw,
built an outline after every update, and a lost command at start left the list never loading.

## Phases

1. Run the model headless at launch; remove the xterm page, the `dos` style, the `behind` and
   `inset` looks, the ttygo server and the accessibility outline wrapper. **Done.**
2. Draw in React the screens only the terminal drew. Only one existed (an address written in its
   row); it is now a question of the window. **Done** (commit "an address being written is a
   question of the window").
3. Delete the ANSI render code, the key and mouse handling and the terminal widgets. **Done.**
   `workspace` drives `downloadsession.Session` itself: no `menubar`, no screen model, no text-input
   widgets. The packages `dialog`, `look`, `cells`, `keybar`, `lineedit`, `menubar`, `screenview`,
   `pointer`, `outline`, `run/download` (but its run contract), `run/help`, `run/addlinks`,
   `run/loading`, `editor/*`, `internal/cuppa`, `internal/components` and `testing/{keys,mouse,drawing}`
   are gone, and so is the renderer-neutral guard (`architecture`), which had nothing left to guard.
4. Replace `tea.Msg` and `tea.Cmd` with a small runtime of our own (package `program`); remove
   bubbletea, lipgloss and the other terminal libraries from `go.mod`. **Done.**

## Decisions

- The update logic of `workspace`, `run` and `setup` stays; only the drawing goes.
- A new config starts in `mac-os-9` (`config.DefaultWindowStyle`). An old `window_style=dos` reads as
  the default.
- `workspaceApp.View` is empty when a host draws the window. It still draws for a host with no
  window, only so the tests of the terminal popup keep working until phase 3 deletes them.
- Tests tied to the removed terminal look (terminal socket, page header, covered screen, DOS theme)
  were removed or rewritten with the code they tested.

## Found on the way

- `workspaceApp.update` dropped the command that a `WindowSizeMsg` produced. When that message
  began loading the list, the workspace stayed "starting" and nothing loaded. Fixed, with a test.
- The click lag came mostly from the page: a shell with `NODE_ENV=local` made Vite bundle the
  development React, which kept the main thread 99.9% busy while a list loaded (13% with the
  production bundle). `vite.config.mts` now sets `NODE_ENV=production` for every build.
- `ShowPreferences` focused the preferences window at every model update (about 8 a second), which
  made an open dropdown blink. It no longer does.
- A source shows "x of z official found" until its download starts, then "x of z downloaded".

## Left over from test runs

Each launch saves a draft list in `%APPDATA%\mvd\lists` (`Untitled list 12.mvd` to `47`). They are
not deleted; the person decides.

## Left to do

- The docs that describe the terminal interface (`NORMAL-README.md`, `nerdy-info.md`,
  `docs/architecture/views-hold-no-logic.md`, `docs/screenshots/README.md`) need a rewrite.
- `playlisteditor` and `menumodel` stay: they are pure models the workspace still uses.
- The keys the window sends are the plain letters only: `j k f t r d D x o` and Space. The other
  keys of the old download screen (`c`, `F`, `l`, `s`, `a`, `q`) had no use in the window.
