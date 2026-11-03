package workspace

import (
	"strings"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/playlistfile"
	"youtube-downloader/libs/mvd-core/runstate"
)

// inlineEdit is an address being written: a new one, in the row it will take, or one that is being
// changed. The window shows it as a question with one line to write in.
type inlineEdit struct {
	on     bool
	adding bool
	// running is a link being added to the run that is going on: its row is one the window makes up
	// for as long as it is written, and goes when it is done.
	running bool
	index   int // the row, counted in the list as it will be
	// before is the playlist the cursor was on, for a cancelled add to put it back.
	before int
	// text is what is written.
	text string
}

// startAdd opens a new row after the playlist the cursor is on, to write an address in.
func (m Model) startAdd() (Model, program.Cmd) {
	if m.addable() {
		return m.startAddToRun(), nil
	}
	if !m.editable() {
		return m, nil
	}
	m = m.stopInline(false)
	items := cloneItems(m.session.File().Items)
	at, before := len(items), len(items)-1
	if i, ok := m.selected(); ok {
		at, before = i+1, i
	}
	shown := append(append(append([]playlistfile.Item(nil), items[:at]...), playlistfile.Item{}), items[at:]...)
	m.dl.Show(downloadlist.PreviewOf(playlistfile.File{Items: shown}))
	m.dl.SelectPlaylist(at)
	m.inline = inlineEdit{on: true, adding: true, index: at, before: before}
	return m, nil
}

// startAddToRun opens a row at the end of the playlists of the run, to write an address in: the
// same place and the same way as when the list is only being made.
func (m Model) startAddToRun() Model {
	m = m.stopInline(false)
	state := m.dl.State
	before := m.dl.SelPlaylist
	state.Playlists = append(state.Playlists, &runstate.Playlist{Index: -1, Listed: true})
	at := len(state.Playlists) - 1
	m.dl.SelectPlaylist(at)
	m.inline = inlineEdit{on: true, adding: true, running: true, index: at, before: before}

	return m
}

// startChange turns the row of playlist i into a place to write another address.
func (m Model) startChange(i int) (Model, program.Cmd) {
	items := m.session.File().Items
	if !m.editable() || i < 0 || i >= len(items) {
		return m, nil
	}
	m = m.stopInline(false)
	m.dl.SelectPlaylist(i)
	m.inline = inlineEdit{on: true, index: i, before: i, text: items[i].Source}
	return m, nil
}

// stopInline ends the editing: with keep, what was written becomes the address; without, the
// list is as it was.
func (m Model) stopInline(keep bool) Model {
	if !m.inline.on {
		return m
	}
	e := m.inline
	m.inline = inlineEdit{}
	text := strings.TrimSpace(e.text)
	if e.running && !e.adding {
		// Another address for a link of the run: the old one is taken out, the new one loaded.
		m.dl.SelectPlaylist(e.before)
		if keep && text != "" {
			if old, ok := m.runLinkAt(e.index); !ok || old != text {
				links, _ := parseLinks(text)
				m = m.removeFromRun(e.index).addToRun(links)
			}
		}

		return m
	}
	if e.running {
		state := m.dl.State
		if n := len(state.Playlists); n > 0 && n-1 == e.index {
			state.Playlists = state.Playlists[:n-1]
		}
		m.dl.SelectPlaylist(e.before)
		if keep && text != "" {
			links, _ := parseLinks(text)
			m = m.addToRun(links)
		}

		return m
	}
	switch {
	case keep && text != "" && e.adding:
		links, _ := parseLinks(text)
		added := make([]playlistfile.Item, 0, len(links))
		for _, link := range links {
			added = append(added, playlistfile.Item{Source: link})
		}
		items := cloneItems(m.session.File().Items)
		out := append(append(append([]playlistfile.Item(nil), items[:e.index]...), added...), items[e.index:]...)
		return m.setItems(out, e.index)
	case keep && text != "":
		return m.changeAddress(e.index, text)
	}
	m.dl.Show(m.session.Preview())
	m.dl.SelectPlaylist(e.before)
	return m
}

// inlineEnter keeps what was written when it is a link; otherwise the question stays open with the
// reason, and the person fixes the address where it is.
func (m Model) inlineEnter() Model {
	if reason := notALink(m.inline.text); reason != "" {
		m.notice = reason

		return m
	}

	return m.stopInline(true)
}
