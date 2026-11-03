package workspace

import (
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
)

func listOf(addresses ...string) Model {
	return sized(New(Host{Version: "1.2.3"}, config.Config{}, downloadlist.New(addresses)))
}

func addressesOf(m Model) []string { return m.session.Sources() }

func TestSaveAsHasItsOwnShortcutAndHelpHasNoOpenSource(t *testing.T) {
	var saveAs string
	var help []string
	for _, mn := range menus() {
		for _, e := range mn.Entries {
			if e.Name == entrySaveAs {
				saveAs = e.Shortcut
			}
			if mn.Name == "Help" && !e.Separator {
				help = append(help, e.Name)
			}
		}
	}
	if saveAs != "Ctrl+Shift+S" {
		t.Errorf("Save as has %q", saveAs)
	}
	if want := []string{entryShortcuts, entryDocs, entryReport, entryUpdates, entryAbout}; strings.Join(help, "|") != strings.Join(want, "|") {
		t.Errorf("Help has %v, want %v", help, want)
	}
}

func TestTheListIsChangedInPlaceAndTheChangesCanBeUndone(t *testing.T) {
	m := listOf("https://a", "https://b", "https://c")
	next, _ := m.Update(listEdit{op: "move", index: 0, to: 2})
	m = next.(Model)
	if got := addressesOf(m); got[0] != "https://b" || got[2] != "https://a" {
		t.Errorf("after the move %v", got)
	}
	next, _ = m.Update(listEdit{op: "remove", index: 1})
	m = next.(Model)
	if got := addressesOf(m); len(got) != 2 || got[1] != "https://a" {
		t.Errorf("after the remove %v", got)
	}
	m, _ = choose(m, entryUndo)
	m, _ = choose(m, entryUndo)
	if got := addressesOf(m); len(got) != 3 || got[0] != "https://a" {
		t.Errorf("after two undos %v", got)
	}
	m, _ = choose(m, entryRedo)
	if got := addressesOf(m); got[0] != "https://b" {
		t.Errorf("after a redo %v", got)
	}
}

type fakeClipboard struct{ text string }

func (c *fakeClipboard) Read() (string, error) { return c.text, nil }
func (c *fakeClipboard) Write(t string) error  { c.text = t; return nil }

func TestCheckForUpdatesRunsTheHostsCheckAndShowsWhatItSays(t *testing.T) {
	m := New(Host{Version: "1.2.3", CheckForUpdate: func() string { return "MVD 1.2.3 is up to date." }}, config.Config{}, downloadlist.New([]string{"a"}))
	m = sized(m)
	next, cmd := m.Update(entryChosenMsg{entryUpdates})
	m = next.(Model)
	if cmd == nil {
		t.Fatal("no check was started")
	}
	next, _ = m.Update(cmd())
	if got := next.(Model).notice; got != "MVD 1.2.3 is up to date." {
		t.Errorf("notice = %q", got)
	}
}
