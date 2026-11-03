package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/workspace/closequestion"
)

// CloseRequestedMsg tells the workspace that the person asked to close the app, for example by the
// close button of its window. The workspace closes it at once, unless songs are being downloaded,
// when it asks first.
type CloseRequestedMsg struct{}

// downloading is how many songs are being downloaded or wait for their turn to be.
func (m Model) downloading() int { return m.facts().Downloading() }

// closeRequested closes the app, after asking when songs are being downloaded.
func (m Model) closeRequested() (Model, program.Cmd) {
	if m.downloading() > 0 {
		m.closing = closequestion.Ask()

		return m, nil
	}

	return m.stop(true)
}

// quitNow stops the downloads and closes the app.
func (m Model) quitNow() (Model, program.Cmd) {
	m.closing = closequestion.State{}

	return m.stop(true)
}
