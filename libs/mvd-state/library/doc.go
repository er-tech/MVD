// Package library holds what the page shows, the sources and their songs, and the changes since the
// last time the page was told. It knows nothing of Wails, of transport or of the engine: the engine
// writes rows, the feed drains the changes, and the page can ask for everything at once.
//
// Sources and songs share one revision, so a page that misses a batch notices it once and asks for
// everything again, whatever kind of row it missed.
package library
