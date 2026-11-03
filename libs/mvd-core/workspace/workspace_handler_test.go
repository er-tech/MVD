package workspace

import (
	"strings"
	"testing"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
)

func sized(m Model) Model {
	next, _ := m.Update(program.WindowSizeMsg{Width: 100, Height: 30})
	return next.(Model)
}

func choose(m Model, entry string) (Model, program.Cmd) {
	next, cmd := m.Update(entryChosenMsg{entry})
	return next.(Model), cmd
}

func TestStartingWithNothingToStartWithSaysSo(t *testing.T) {
	host := Host{ListDir: t.TempDir()}
	m := sized(New(host, config.Config{}, downloadlist.New([]string{"https://youtu.be/x"})))
	m, _ = choose(m, entryStart)
	if m.notice != "Downloading is not available here" {
		t.Errorf("notice %q", m.notice)
	}
}

func TestAnEmptyListDoesNotStart(t *testing.T) {
	m := sized(New(Host{}, config.Config{}, nil))
	m, _ = choose(m, entryStart)
	if !strings.Contains(m.notice, "empty") {
		t.Errorf("notice %q", m.notice)
	}
}
