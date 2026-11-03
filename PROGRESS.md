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
   `ThemeName`, `prefsform` colour fields), `Backdrop`/`Modal`, golden tests. **Open.**
4. Replace `tea.Msg` and `tea.Cmd` with a small runtime of our own; remove bubbletea, lipgloss and
   the other terminal libraries from `go.mod`. **Open.**

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
- The window still costs about 120% of a core in one WebView2 process while a list loads, with no
  terminal at all. Next: profile the songs table (react-aria `Table`, one row per song).

## Left over from test runs

Each launch saves a draft list in `%APPDATA%\mvd\lists` (`Untitled list 12.mvd` to `47`). They are
not deleted; the person decides.
