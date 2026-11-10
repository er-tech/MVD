package bridge

import "youtube-downloader/apps/mvd/runhost"

// AddSource puts a playlist, an album or a song in the list and starts to load it at once. The
// error says why the link was refused.
//
// url is the address the person wrote or pasted.
func (a *App) AddSource(url string) error {
	if err := a.toolsError(); err != nil {
		return err
	}

	return a.session.AddSource(url)
}

// AddMusicSearch puts the songs of an artist, an album or one song, found by name, in the list.
//
// artist is needed; album and song may be empty, but not an album or a song alone. The error says what to write.
func (a *App) AddMusicSearch(artist, album, song string) error {
	if err := a.toolsError(); err != nil {
		return err
	}

	return a.session.AddSearch(artist, album, song)
}

// ReplaceVideo gives a song another video to download.
//
// id is the ID of the song row and text a YouTube video link or its ID. The error says why it cannot.
func (a *App) ReplaceVideo(id, text string) error {
	return a.session.ReplaceVideo(id, text)
}

// RemoveSource takes a source and its songs out of the list.
//
// id is the ID of the source row.
func (a *App) RemoveSource(id string) error {
	return a.session.RemoveSource(id)
}

// MoveSource puts a source at a place of the list, which counts from 1. The order is kept when the
// list is saved.
//
// id is the ID of the source row and to the place it goes to.
func (a *App) MoveSource(id string, to int) error {
	return a.session.MoveSource(id, to)
}

// GetDetail says all there is to know about the selected source or song, for the details panel.
//
// kind is "source" or "song" and id the ID of the row. The error says the item is not in the list.
func (a *App) GetDetail(kind, id string) (runhost.Detail, error) {
	return a.session.Detail(kind, id)
}
