package workspace

import (
	"net/url"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/workspace/runcontrol"
)

// AboutOpen reports whether the About window is showing.
func (m Model) AboutOpen() bool { return m.about }

// Confirm shows, as the status line, that what the person asked for was done.
func (m Model) Confirm(text string) Model {
	m.done, m.caution = text, ""
	return m
}

// Caution shows something the person should know about what they just did.
func (m Model) Caution(text string) Model {
	m.caution, m.done = text, ""
	return m
}

// WindowOpen reports whether a window of the workspace (About, Keyboard shortcuts, a question) is
// showing over the main window.
func (m Model) WindowOpen() bool { return m.about || m.shortcuts || m.closing.On || m.addOpen }

// updateNote is the line about a newer version that the About window adds, or "".
func (m Model) updateNote() string {
	if m.host.UpdateNote == nil {
		return ""
	}

	return m.host.UpdateNote()
}

// openAddress opens an address in the person's browser, or says it when there is none.
func (m *Model) openAddress(address string) {
	if m.host.Open == nil {
		m.notice = "Open " + address + " in your browser"
		return
	}
	if err := m.host.Open(address); err != nil {
		m.notice = "Cannot open the browser: " + err.Error()
	}
}

// reportAddress is the page for a new issue of the project, with the version already in it.
func (m Model) reportAddress() string {
	version := m.host.Version
	if version == "" {
		version = "dev"
	}
	body := "MVD " + version + "\n\nWhat I did:\n\nWhat I expected:\n\nWhat happened instead:\n"
	return projectURL + "/issues/new?body=" + url.QueryEscape(body)
}

// refreshMenus greys out what the menus offer and does not make sense now. Copy and Paste are
// for the address being written, and Copy needs something selected; the other commands work
// on the playlist the cursor is on, and wait for the downloads to stop.
func (m Model) refreshMenus() Model {
	off := map[string]bool{}
	set := func(name string, on bool) {
		if !on {
			off[name] = true
		}
	}
	i, has := m.selected()
	edit := runcontrol.EditMenuOf(m.facts(), runcontrol.EditFacts{
		WritingAddress:   m.inline.on,
		PlaylistSelected: m.dl.SelPlaylist >= 0,
		CanUndo:          m.history.CanUndo(),
		CanRedo:          m.history.CanRedo(),
		Selected:         i,
		HasCursor:        has,
		Count:            len(m.session.File().Items),
	})
	set(entryCut, edit.Cut)
	set(entryCopy, edit.Copy)
	set(entryPaste, edit.Paste)
	set(entryDelete, edit.Delete)
	set(entryUndo, edit.Undo)
	set(entryRedo, edit.Redo)
	set(entryMoveUp, edit.MoveUp)
	set(entryMoveDown, edit.MoveDown)
	_, waiting := m.toolsWaiting()
	run := runcontrol.RunMenuOf(m.facts(), len(m.session.Sources()) == 0, waiting)
	set(entryStart, run.Start)
	set(entryPause, run.Pause)
	set(entryResume, run.Resume)
	set(entryStop, run.Stop)
	set(entryRetry, run.Retry)
	set(entryOpenFolder, m.host.OpenFolder != nil)
	set(entryDownloadAll, run.DownloadAll)
	m.disabled = off
	m.dl.Editable, m.dl.LinkEditing = m.editable(), m.addable()

	return m
}

// enabled says whether the menu entry called name can be chosen now.
func (m Model) enabled(name string) bool { return !m.disabled[name] }

// Background says whether a message is the workspace's own, which it must get whatever else is
// open: the beat that keeps the list up to date with a run and the one that looks at the tools
// again while they are fetched, a run that started or closed, and the events of the run.
func Background(msg program.Msg) bool {
	switch msg.(type) {
	case saveTickMsg, toolsTickMsg, runStartedMsg, runClosedMsg, evMsg, evClosed:
		return true
	}

	return false
}
