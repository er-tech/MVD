package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/run/downloadsession"
)

// The links of a run that goes on are changed on the run: a link taken out has its songs dropped,
// one added is loaded, and the list keeps what the run has. The order of the links is the run's.

// runLinkAt is the address of the link the screen shows at place pos, and whether there is one.
func (m Model) runLinkAt(pos int) (string, bool) {
	playlists := m.dl.State.Playlists
	if pos < 0 || pos >= len(playlists) {
		return "", false
	}

	return playlists[pos].URL, true
}

// removeFromRun takes the link at place pos of the screen out of the run and out of the list.
func (m Model) removeFromRun(pos int) Model {
	remover, ok := m.run.(downloadsession.SourceRemover)
	playlists := m.dl.State.Playlists
	if !ok || pos < 0 || pos >= len(playlists) {
		return m
	}
	link := playlists[pos]
	if !remover.RemoveSource(link.Index) {
		m.notice = "That link cannot be taken out now"

		return m
	}
	items := cloneItems(m.session.File().Items)
	for i, item := range items {
		if item.Source == link.URL {
			items = append(items[:i], items[i+1:]...)

			break
		}
	}
	if err := m.session.Replace(items); err != nil {
		m.notice = "Cannot save the list: " + err.Error()
	}
	m.loadedKey = m.sourcesKey()
	m.syncFile()
	m.done = "Removed: its songs are dropped"

	return m
}

// editRun does what the person did to a link of the run: take it out, or change its address.
func (m Model) editRun(msg listEdit) (program.Model, program.Cmd) {
	switch msg.op {
	case "remove":
		return m.removeFromRun(msg.index), nil
	case "edit":
		return m.startChangeRun(msg.index), nil
	case "move":
		m.notice = "The order of the links cannot change while their songs load"
	}

	return m, nil
}

// editRunCommand works the Edit menu on a run: what makes sense while it goes on.
func (m Model) editRunCommand(name string) (program.Model, program.Cmd) {
	switch name {
	case entryPaste:
		return m.paste()
	case entryCopy, entryCut:
		return m, nil
	case entryDelete:
		return m.removeFromRun(m.dl.SelPlaylist), nil
	}
	m.notice = "That waits until the songs have loaded"

	return m, nil
}

// startChangeRun turns the row of the link at place pos into a place to write another address.
func (m Model) startChangeRun(pos int) Model {
	link, ok := m.runLinkAt(pos)
	if !ok {
		return m
	}
	m = m.stopInline(false)
	m.dl.SelectPlaylist(pos)
	m.inline = inlineEdit{on: true, running: true, index: pos, before: pos, text: link}

	return m
}
