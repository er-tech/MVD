// Package songrows holds the song rows the page shows and the changes since the last time the page
// was told. It knows nothing of Wails, of transport or of the engine: the engine writes rows, the
// feed drains the changes, and the page can ask for all the rows at once.
package songrows
