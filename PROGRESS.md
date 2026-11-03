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
3. Delete the ANSI render code: `dialog`, `cells`, `look`, `keybar`, `lineedit` rendering, `menubar`,
   `screenview`, `View` functions, `Outline`, the terminal theme colours (`config.Colors`,
   `ThemeName`, `prefsform` colour fields), `Backdrop`/`Modal`, golden tests. **Started:** the setup
   screens and setup model (121 files, 8,300 lines) are gone. The rest is open, see "Next steps".
4. Replace `tea.Msg` and `tea.Cmd` with a small runtime of our own; remove bubbletea, lipgloss and
   the other terminal libraries from `go.mod`. **Started:** package `program` (Msg, Cmd, Model, Batch,
   Tick, Quit, a headless runner) exists and is tested, and nothing uses it yet.

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

## Next steps (found while sizing phases 3 and 4)

- `deadcode` cannot find the render code: a `View()` called through an interface keeps every
  `View()` alive. Delete by compiling instead: remove a package's `View`/`Render`, then fix the
  callers.
- `tea.Cmd` is a defined type and `tea.Msg` is `uv.Event`, so `program.Cmd` cannot replace it while
  a Bubbles widget (`textinput`, `textarea`) still returns one. Remove the widgets first (the line
  questions in `workspace`, `lineedit`, `prefspopup`), then swap `tea.Model/Cmd/Msg/Batch/Tick/Quit`
  for the `program` ones and run `Start` on `program.New`.
- The window sends intents, not keys or mouse events, so the key and mouse handling in `workspace`,
  `run/download` and `menubar` is dead. About 200 uses of `tea.KeyPressMsg` and `tea.Mouse*Msg` in
  tests go with it. Tests that read a behaviour out of the drawn text need a rewrite against
  `Window()` snapshots, not a deletion.
- Order: render and widgets in `workspace`; `run/download` screen; `prefspopup`, `menubar`, `dialog`,
  `look`, `cells`, `keybar`, `lineedit`, `screenview`, `internal/cuppa`; then the runtime swap; then
  `go mod tidy`.
