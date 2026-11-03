package workspace

import (
	"time"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/workspace/runcontrol"
)

// The buttons of the toolbar, and the Run menu entries that do the same.
const (
	entryStart       = "Load playlists"
	entryAddLink     = "Add source…"
	entryPause       = "Pause downloads"
	entryResume      = "Download"
	entryStop        = "Stop and cancel"
	entryRetry       = "Retry failed"
	entryDownloadAll = "Accept all songs"
)

// acceptAllLabel is the toolbar button of a themed window for entryDownloadAll.
const acceptAllLabel = "✓ Accept all songs"

// canAcceptAll says some song of the run waits for the person and accepting them all is allowed now.
func (m Model) canAcceptAll() bool {
	_, waiting := m.toolsWaiting()

	return runcontrol.RunMenuOf(m.facts(), len(m.session.Sources()) == 0, waiting).DownloadAll
}

// button is one button of the toolbar.
type button struct {
	label    string // what it says
	entry    string // what choosing it does, as the entry of a menu is named
	disabled bool
}

// buttons are the toolbar's buttons for what the workspace is doing: the list can be started
// or edited while nothing runs; a run can be paused, stopped, retried and reviewed.
func (m Model) buttons() []button {
	busy := m.life.Busy()
	if m.finished() {
		// The work is over: show where it went, and offer what comes next.
		out := []button{{"Open folder", entryOpenFolder, false}, {"► Load playlists again", entryStart, busy}}
		if m.dl.State.Tally().Failed > 0 {
			out = append(out, button{"Retry failed", entryRetry, busy})
		}
		out = append(out, button{"+ Add source", entryAddLink, busy})
		if m.dl.State.Tally().Done == 0 {
			// Nothing was saved, so the folder is not where the person goes next: the first button
			// that can be used is the main one, and that is the way to give another source.
			out = append(out[len(out)-1:], out[:len(out)-1]...)
		}

		return out
	}
	if !m.running() {
		_, waiting := m.toolsWaiting()
		nothing := busy || waiting || len(m.session.Sources()) == 0 // there is nothing to download, or no tool to do it with
		return []button{
			{"► Load playlists", entryStart, nothing},
			{"+ Add source", entryAddLink, busy},
		}
	}
	// Download starts the downloads of what was accepted, and Pause downloads holds them again: the
	// songs that are on their way finish, and nothing else begins.
	download := button{"► Download", entryResume, busy}
	if !m.run.Paused() {
		download = button{"Pause downloads", entryPause, busy}
	}
	out := []button{download, {"Retry failed", entryRetry, busy || m.facts().Tally.Failed == 0}, {"+ Add source", entryAddLink, busy}}
	return out
}

// isMain says whether button i is the main one: the first that can be used.
func isMain(buttons []button, i int) bool {
	for j, b := range buttons {
		if !b.disabled {
			return j == i
		}
	}

	return false
}

// runChoice does what the entries of the Run menu, and the buttons of the toolbar, say.
func (m Model) runChoice(name string) (program.Model, program.Cmd, bool) {
	switch name {
	case entryStart:
		next, cmd := m.start(true)
		return next, cmd, true
	case entryPause, entryResume:
		return m.togglePause(), nil, true
	case entryStop:
		next, cmd := m.stop(false)
		return next, cmd, true
	case entryRetry:
		return m.retryAll(), nil, true
	case entryOpenFolder:
		m.openFolder()
		return m, nil, true
	case entryAddLink:
		next, cmd := m.openAdd()
		return next, cmd, true
	case entryDownloadAll:
		if m.running() {
			m.done = runcontrol.AcceptedNotice(m.run.ReleaseAll(), m.run.Paused())
		}
		return m, nil, true
	}
	return m, nil, false
}

// toolsWaiting says whether the tools of the downloads are not ready, and what they are.
func (m Model) toolsWaiting() (ToolsState, bool) {
	if m.host.Tools == nil {
		return ToolsState{}, false
	}
	state := m.host.Tools()

	return state, !state.Ready
}

// toolsEvery is how often the state of the tools is looked at while they are being fetched.
const toolsEvery = 400 * time.Millisecond

// toolsTick asks to be woken to look at the tools again, as long as they are being fetched; it
// is nothing once they are ready or when one could not be gotten, which does not change.
func (m Model) toolsTick() program.Cmd {
	state, waiting := m.toolsWaiting()
	if !waiting || state.Failed {
		return nil
	}

	return program.Tick(toolsEvery, func(t time.Time) program.Msg { return toolsTickMsg(t) })
}
