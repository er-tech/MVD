# Screenshots of the download screen

The download screen of MVD 0.0.91 (the Links list, the Songs table and the Details pane), in
the themes that come with the app.

## Real downloads

`real-download-<theme>.png` is the app running for real: three single videos downloaded in a
throw-away profile (one link was an address that could not be read, on purpose, so the
"can't read" state shows). Themes: MVD Neon, Dracula, Nord, Tokyo Night, Solarized Light, Light+.

A Songs table has more than one row only for a playlist, and no real playlist is downloaded
to make a screenshot, so the sample screens below fill that in.

## Sample screens, every theme

`<theme>.png` is the same screen drawn from made-up songs in every state (finished, already
had, failed, downloading, finding, no official video, waiting), with album and quality filled in.
`mvd-neon-technical.png` is the same screen after pressing `t`, which swaps Details for the
tool's own log.

Themes: mvd-neon, dark-plus, monokai, dracula, one-dark, nord, tokyo-night, github-dark,
solarized-dark, solarized-light, light-plus.

## Making them again

Take the screenshots from the running window. Start the app with a throw-away profile (set
`APPDATA`, or `HOME` on macOS and Linux, to an empty folder), put the sample links in the list and
capture the window of each theme. The old generator that drew `.ansi` frames from the terminal
screen is gone, because the app has no terminal screen any more.
