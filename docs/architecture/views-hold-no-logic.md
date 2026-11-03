# Views hold no logic

Issue #344. The screens of MVD hold no behaviour. What a screen does lives in Go, in a package that
knows no renderer. The renderer is the web page (`apps/mvd-web`, with the Windows 95, Mac OS 9 and
Windows 3.1 looks and more). It only turns input into intents and a snapshot into pixels. The
terminal renderer is gone (#448): the app model runs headless on `libs/mvd-core/program`.

## The layers

```
engine, runstate                  the core: runs, events, plain state
downloadsession, prefsform ...    one window's behaviour: state, intents, effects
workspace, tui                    the app model: handles intents and run events, builds the snapshot
web adapter (apps/mvd-web)        JSON out and in; React draws it
```

## What a neutral package is

1. It imports no drawing or input code. The renderer is a web page, so no Go package draws.
2. **State** is a struct (`Session`, or `Screen` for a small one) with exported fields for what a
   renderer may read. It is a value: a copy of a screen keeps its own state, so a map or slice is
   replaced, never changed in place. The app model holds it by value.
3. **Intents** are methods named for what the person means: `TickSong(id, extend)`, `SortBy(column)`,
   `AcceptSongs()`, `ToggleFollow()`. Never a key, a coordinate, a cell or a pixel. A method changes
   the state (pointer receiver) and, when the host must do something, returns an **Effect**.
4. **Effects** are plain values (`OpenURL{URL}`, `Quit{}`, ...), in an `effect_contract.go`. The
   app model turns them into commands (`program.Cmd`) or into events for the page.
5. **Text being edited** is a string in the state. The widget (a DOM textarea)
   belongs to the page and pushes its value up with an intent such as `SetLinksText(s)`.
6. **Words the person reads** that every renderer should say alike (a notice such as "3 songs
   accepted: they will download", a status word) are in the neutral package. How they look is not.
7. Things that need the engine take an interface the package declares (`Controller`, `Chooser`,
   `SourceAdder`); the host passes the real run.

## What stays in the renderer

The test: *would a second renderer have to agree on it?* If yes it is in the neutral package, if
no it stays in the adapter.

- Sizes in pixels: column and pane widths, the dragging of a border, scroll offsets, the height
  of a pane, the animations.
- Hit-testing by position, hover, pressed, focus rings, and whether a popup is only a visual
  overlay.
- Colours and glyphs (a tone or a kind is neutral; the colour or the glyph is the page's).
- The key that does an intent (`d` accepts as a key; a button or a menu does too).
- The widgets themselves.

## How to extract one area

1. Read the area; list its state, its decisions, its effects and its drawing.
2. Create the neutral package beside it with the files named by role (`*_model.go`,
   `*_use_case.go`, `*_policy.go`, `*_contract.go`, `*_algorithm.go`), at most 12 production files.
3. Move state and decisions in; leave the app model translating messages to intents and the state to
   the snapshot. Do it in steps that keep `go test ./...` green.
4. Move the behaviour tests into the neutral package, driving intents. The page keeps its own
   tests of drawing and input.
5. The behaviour tests must pass **without being edited**, except for renamed fields.
6. `refactor:` commits (they do not release), `Part of #344` in the PR, one area per PR.

## Areas

| Area | Where it is today |
|---|---|
| song list rules | `songlist` (done, #346) |
| download screen | `run/downloadsession`, `run/downloadsnapshot` (done) |
| preferences | `prefsform`, `prefspopup` (done) |
| workspace and app flow | `workspace`, `tui`, `apps/mvd/terminalui` (done, #448) |
