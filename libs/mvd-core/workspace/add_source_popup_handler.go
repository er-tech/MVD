package workspace

import (
	"strings"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/workspace/addsource"
)

// openAdd shows the window for adding music, with the platform address chosen.
func (m Model) openAdd() (Model, program.Cmd) {
	m = m.stopInline(false)
	m.add, m.addOpen = addsource.New(), true

	return m, nil
}

// closeAdd puts the window away.
func (m Model) closeAdd() Model {
	m.addOpen = false

	return m
}

// submitAdd adds what is written, or shows what is wrong with it.
func (m Model) submitAdd() (program.Model, program.Cmd) {
	result := m.add.Submit(parseLinks)
	m.add = result.State
	if !result.Done {
		return m, nil
	}
	m = m.closeAdd()
	if !m.addable() && !m.editable() {
		m.notice = "Stop the downloads before adding to the list"

		return m, nil
	}

	return m.addAddresses(strings.Join(result.Addresses, "\n")), nil
}
