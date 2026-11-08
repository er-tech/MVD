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
   Code: `libs/mvd-state` (songrows, changefeed), `apps/mvd2` (bridge, childprocs, simulation),
   `apps/mvd2-web` (rowstore, rowsync, backend, songtable, metrics).
   Open: how smith runs `wails build` and stages the page (the build is by hand for now:
   `cp dist/apps/mvd2-web/. apps/mvd2/frontend/dist/`, then `wails build -s` in `apps/mvd2`).
1. Store, bound methods and events. 2. Page shell and virtual table. 3. Details panel.
4. Start and downloads. 5. Modals, Preferences, menus. 6. Packaging and updater. 7. Cutover.

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
