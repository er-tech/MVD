package workspace

import (
	"strings"
	"youtube-downloader/libs/mvd-core/program"
	"youtube-downloader/libs/mvd-core/workspace/listhistory"

	"youtube-downloader/libs/mvd-core/playlistfile"
)

// editable reports whether the list can be changed now: not while a run has its own copy.
func (m Model) editable() bool { return m.facts().Editable() }

func cloneItems(items []playlistfile.Item) []playlistfile.Item { return listhistory.Clone(items) }

// setItems makes items the list, keeping what it was to undo, and puts the cursor on playlist
// sel.
func (m Model) setItems(items []playlistfile.Item, sel int) Model {
	m.history = m.history.Recorded(m.session.File().Items)
	return m.showItems(items, sel)
}

// showItems writes items as the list and the screen shows it, without keeping the old one.
func (m Model) showItems(items []playlistfile.Item, sel int) Model {
	if err := m.session.Replace(items); err != nil {
		m.notice = "Cannot save the list: " + err.Error()
	}
	m.dl.Show(m.session.Preview())
	m.dl.SelectPlaylist(sel)
	return m
}

// selected is the playlist the cursor is on, as an index of the list, and whether there is one.
func (m Model) selected() (int, bool) {
	i := m.dl.SelPlaylist
	return i, i >= 0 && i < len(m.session.File().Items)
}

// listEdit is what the person did to a playlist of the window: op is "edit" (change the address of
// playlist index), "remove" (take it out) or "move" (put it where playlist to is).
type listEdit struct {
	op        string
	index, to int
}

// editList does what the person did to a playlist of the window.
func (m Model) editList(msg listEdit) (program.Model, program.Cmd) {
	m = m.settle()
	if m.addable() {
		return m.editRun(msg)
	}
	if !m.editable() {
		m.notice = "One moment..."
		return m, nil
	}
	items := cloneItems(m.session.File().Items)
	if msg.index < 0 || msg.index >= len(items) {
		return m, nil
	}
	switch msg.op {
	case "remove":
		m = m.setItems(append(items[:msg.index], items[msg.index+1:]...), msg.index)
	case "move":
		if msg.to < 0 || msg.to >= len(items) || msg.to == msg.index {
			return m, nil
		}
		moved := items[msg.index]
		rest := append(append([]playlistfile.Item(nil), items[:msg.index]...), items[msg.index+1:]...)
		out := append(append([]playlistfile.Item(nil), rest[:msg.to]...), moved)
		m = m.setItems(append(out, rest[msg.to:]...), msg.to)
	case "edit":
		return m.startChange(msg.index)
	}
	return m, nil
}

// changeAddress gives playlist i another address; the songs it had are no longer its own.
func (m Model) changeAddress(i int, address string) Model {
	items := cloneItems(m.session.File().Items)
	if i < 0 || i >= len(items) || items[i].Source == address {
		return m
	}
	items[i] = playlistfile.Item{Source: address}
	return m.setItems(items, i)
}

// addAddresses adds one playlist for each non-empty line of text, after the one the cursor
// is on (or at the end), and puts the cursor on the first one added.
func (m Model) addAddresses(text string) Model {
	if m.addable() {
		links, _ := parseLinks(text)
		return m.addToRun(links)
	}
	if !m.editable() {
		return m
	}
	var added []playlistfile.Item
	for _, line := range strings.Split(text, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			added = append(added, playlistfile.Item{Source: line})
		}
	}
	if len(added) == 0 {
		return m
	}
	items := cloneItems(m.session.File().Items)
	at := len(items)
	if i, ok := m.selected(); ok {
		at = i + 1
	}
	out := append(append([]playlistfile.Item(nil), items[:at]...), added...)
	return m.setItems(append(out, items[at:]...), at)
}

// editCommand works the commands of the Edit menu on the playlist the cursor is on.
func (m Model) editCommand(name string) (program.Model, program.Cmd) {
	m = m.settle()
	if m.addable() {
		return m.editRunCommand(name)
	}
	if !m.editable() {
		m.notice = "One moment..."
		return m, nil
	}
	i, ok := m.selected()
	switch name {
	case entryUndo:
		history, last, ok := m.history.Undone(m.session.File().Items)
		if !ok {
			return m, nil
		}
		m.history = history
		return m.showItems(last, i), nil
	case entryRedo:
		history, last, ok := m.history.Redone(m.session.File().Items)
		if !ok {
			return m, nil
		}
		m.history = history
		return m.showItems(last, i), nil
	case entryPaste:
		return m.paste()
	case entryCopy, entryCut:
		return m, nil // they work on the address being written, which the window's own field handles
	}
	if !ok {
		return m, nil
	}
	switch name {
	case entryDelete:
		return m.editList(listEdit{op: "remove", index: i})
	case entryMoveUp:
		return m.editList(listEdit{op: "move", index: i, to: i - 1})
	case entryMoveDown:
		return m.editList(listEdit{op: "move", index: i, to: i + 1})
	}
	return m, nil
}

// paste adds the links of the clipboard to the list.
func (m Model) paste() (program.Model, program.Cmd) {
	if m.host.Clipboard == nil {
		m.notice = "Cannot paste: there is no clipboard"
		return m, nil
	}
	text, err := m.host.Clipboard.Read()
	if err != nil {
		m.notice = "Cannot paste: " + err.Error()
		return m, nil
	}
	return m.addAddresses(text), nil
}
