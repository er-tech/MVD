package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/run/downloadsession"
	"youtube-downloader/libs/mvd-core/workspace/addsource"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// WindowIntentMsg is what the person did in a classic themed window. The workspace does what the
// terminal look does for the same click or key, so both looks behave alike.
type WindowIntentMsg windowsnapshot.Intent

// windowIntent does what an intent of a themed window asks.
func (m Model) windowIntent(in windowsnapshot.Intent) (program.Model, program.Cmd) {
	switch in.Kind {
	case windowsnapshot.IntentMenu:
		if !m.enabled(in.ID) {
			return m, nil
		}
		return m.choose(in.ID)
	case windowsnapshot.IntentButton:
		if in.ID == entryDownloadAll && m.canAcceptAll() {
			return m.choose(entryDownloadAll)
		}
		for _, b := range m.buttons() {
			if b.entry == in.ID && !b.disabled {
				return m.choose(b.entry)
			}
		}
	case windowsnapshot.IntentSelectSource:
		m.dl.ChoosePlaylist(in.Index)
	case windowsnapshot.IntentSelectSong:
		m.dl.ChooseEntry(in.Index)
	case windowsnapshot.IntentTickSong:
		if ids := m.dl.VisibleEntries(); in.Index >= 0 && in.Index < len(ids) {
			if id := ids[in.Index]; m.dl.Picked[id] != in.Ticked {
				m.dl.TickSong(id, false)
			}
		}
	case windowsnapshot.IntentAddingMode, windowsnapshot.IntentAddingText, windowsnapshot.IntentAddingButton:
		if m.addOpen {
			return m.windowAddIntent(in)
		}
	case windowsnapshot.IntentQuestionButton, windowsnapshot.IntentQuestionText:
		return m.questionIntent(in)
	case windowsnapshot.IntentKey:
		return m.keyIntent(in.Key)
	}
	// The window's own buttons (minimise, maximise, close) are the host's: closing reaches the
	// workspace as CloseRequestedMsg, as the operating system's close button does.

	return m, nil
}

// windowAddIntent does what is asked in the window for adding music.
func (m Model) windowAddIntent(in windowsnapshot.Intent) (program.Model, program.Cmd) {
	switch in.Kind {
	case windowsnapshot.IntentAddingMode:
		mode := addsource.ModeURL
		if in.Mode == windowsnapshot.ModeSearch {
			mode = addsource.ModeSearch
		}
		m.add = m.add.WithMode(mode)

		return m, nil
	case windowsnapshot.IntentAddingText:
		for f, name := range addFields {
			if name == in.Field {
				m.add = m.add.SetText(f, in.Text).Focused(f)
				return m, nil
			}
		}
	case windowsnapshot.IntentAddingButton:
		if in.ID == "add" {
			return m.submitAdd()
		}

		return m.closeAdd(), nil
	}

	return m, nil
}

// keyIntent does what a plain key of the window asks, as the person would press it over the songs.
func (m Model) keyIntent(key string) (program.Model, program.Cmd) {
	switch key {
	case "j":
		m.dl.Move(1)
	case "k":
		m.dl.Move(-1)
	case "f":
		m.dl.ToggleFailedOnly()
	case "t":
		m.dl.ToggleTechnical()
	case "r":
		m.dl.Retry()
	case "d", "D", "x", "o", "Space":
		if !m.dl.CanChoose() {
			return m, nil
		}
		switch key {
		case "D":
			m.dl.AcceptAll()
		case "d":
			m.dl.Accept()
		case "x":
			m.dl.Reject()
		case "Space":
			m.dl.TickCursorSong()
		case "o":
			if open, ok := m.dl.OpenVideo().(downloadsession.OpenURL); ok {
				m.openVideo(open.URL)
			}
		}
	}

	return m, nil
}
