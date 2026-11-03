package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/engine"
)

// finishRun makes the run of the model look as one that has ended: its songs are in the state
// the engine would have left them in, and it has said it is idle.
func finishRun(t *testing.T, m Model, done, failed int) Model {
	t.Helper()
	state := m.dl.State
	state.Apply(engine.EvPlaylistAdded{Source: engine.PlaylistSource{Index: len(state.Playlists), URL: "https://a"}})
	state.Apply(engine.EvPlaylistListed{Playlist: 0, Title: "a", Entries: entriesOf(done + failed)})
	for i := 0; i < done+failed; i++ {
		s := engine.StateDone
		if i >= done {
			s = engine.StateFailed
		}
		state.Apply(engine.EvEntryState{Entry: i, State: s})
	}
	state.Apply(engine.EvIdle{})

	return m
}

func entriesOf(n int) []engine.EntryInfo {
	out := make([]engine.EntryInfo, n)
	for i := range out {
		out[i] = engine.EntryInfo{ID: i, Playlist: 0, Index: i + 1, VideoID: "v", Title: "song"}
	}

	return out
}

func labels(buttons []button) string {
	var out []string
	for _, b := range buttons {
		out = append(out, b.label)
	}

	return strings.Join(out, "|")
}

func TestARunThatIsDownloadingIsStillRunningAndNewIsRefused(t *testing.T) {
	m, _ := started(t)
	m = download(m)
	if m.finished() || !m.active() {
		t.Fatal("a run with work to do is not finished")
	}
	next, _ := m.Update(entryChosenMsg{entryNew})
	if got := next.(Model).notice; !strings.Contains(got, "Stop the downloads") {
		t.Errorf("starting a new list during a run says %q", got)
	}
}

func TestAFinishedRunOffersTheIdleButtonsAndNotPauseOrStop(t *testing.T) {
	m, _ := started(t)
	m = finishRun(t, m, 2, 0)
	if !m.finished() || m.active() {
		t.Fatalf("finished %v active %v", m.finished(), m.active())
	}
	got := labels(m.buttons())
	if got != "Open folder|► Load playlists again|+ Add source" {
		t.Errorf("the buttons are %q", got)
	}
	if strings.Contains(got, "Pause") || strings.Contains(got, "Stop") {
		t.Errorf("a finished run still offers %q", got)
	}
}

func TestAFinishedRunWithFailuresOffersRetryToo(t *testing.T) {
	m, _ := started(t)
	m = finishRun(t, m, 1, 2)
	if got := labels(m.buttons()); got != "Open folder|► Load playlists again|Retry failed|+ Add source" {
		t.Errorf("the buttons are %q", got)
	}
}

func TestANewListIsAllowedAfterARunFinishedWithoutPressingStop(t *testing.T) {
	m, fake := started(t)
	m = finishRun(t, m, 1, 0)
	next, _ := m.Update(entryChosenMsg{entryNew})
	m = next.(Model)
	if m.running() || !fake.closed {
		t.Errorf("the finished run was not closed: running %v closed %v", m.running(), fake.closed)
	}
	if strings.Contains(m.notice, "Stop the downloads") {
		t.Errorf("a finished run still asks to be stopped: %q", m.notice)
	}
	if len(m.session.Sources()) != 0 {
		t.Errorf("the new list is not empty: %v", m.session.Sources())
	}
}

func TestOpeningAListIsAllowedAfterARunFinished(t *testing.T) {
	m, _ := started(t)
	m = finishRun(t, m, 1, 0)
	next, _ := m.Update(entryChosenMsg{entryOpen})
	m = next.(Model)
	if m.running() || strings.Contains(m.notice, "Stop the downloads") {
		t.Errorf("opening a list after a finished run: running %v notice %q", m.running(), m.notice)
	}
	if m.asking != askOpen {
		t.Error("the question for the list to open was not asked")
	}
}

func TestAddingALinkAfterARunFinishedOpensTheWindowOnTheList(t *testing.T) {
	m, _ := started(t)
	m = finishRun(t, m, 1, 0)
	next, _ := m.Update(entryChosenMsg{entryAddLink})
	m = next.(Model)
	if m.running() || !m.addOpen {
		t.Errorf("running %v, window open %v", m.running(), m.addOpen)
	}
}

func TestStartAgainEndsTheFinishedRunAndBeginsAnother(t *testing.T) {
	m, fake := started(t)
	m = finishRun(t, m, 1, 0)
	next, cmd := m.Update(entryChosenMsg{entryStart})
	m = next.(Model)
	if !fake.closed {
		t.Error("the finished run was not closed")
	}
	if cmd == nil || !m.life.Starting {
		t.Error("another run did not begin to start")
	}
}

func TestOpenFolderAsksTheHostAndSaysWhenThereIsNone(t *testing.T) {
	m, _ := started(t)
	dir := t.TempDir()
	m.cfg.OutputDir = dir
	var opened string
	m.host.OpenFolder = func(p string) error { opened = p; return nil }
	next, _ := m.Update(entryChosenMsg{entryOpenFolder})
	if opened != dir {
		t.Errorf("the host was asked to open %q, want %q", opened, dir)
	}

	m = next.(Model)
	m.cfg.OutputDir = dir + "-not-there"
	next, _ = m.Update(entryChosenMsg{entryOpenFolder})
	if got := next.(Model).caution; !strings.Contains(got, "made when the first download starts") {
		t.Errorf("a folder that does not exist yet says %q", got)
	}

	m.host.OpenFolder = nil
	m.cfg.OutputDir = dir
	next, _ = m.Update(entryChosenMsg{entryOpenFolder})
	if got := next.(Model).caution; !strings.Contains(got, "The videos are in") {
		t.Errorf("without a host it says %q", got)
	}
	_ = os.Remove(dir)
}

func TestAStopSaysHowManySongsWereSavedAndHowManyWereLeft(t *testing.T) {
	m, _ := started(t)
	state := m.dl.State
	state.Apply(engine.EvPlaylistAdded{Source: engine.PlaylistSource{Index: 0, URL: "https://a"}})
	state.Apply(engine.EvPlaylistListed{Playlist: 0, Title: "a", Entries: entriesOf(5)})
	state.Apply(engine.EvEntryState{Entry: 0, State: engine.StateDone})
	state.Apply(engine.EvEntryState{Entry: 1, State: engine.StateDone})

	next, _ := m.Update(runClosedMsg{})
	if got := next.(Model).done; !strings.Contains(got, "Stopped: 2 saved, 3 not downloaded") {
		t.Errorf("a stop says %q", got)
	}
}

func TestARunThatSavedNothingOffersAnotherSourceBeforeTheFolder(t *testing.T) {
	m, _ := started(t)
	m = finishRun(t, m, 0, 1)
	if got := labels(m.buttons()); got != "+ Add source|Open folder|► Load playlists again|Retry failed" {
		t.Errorf("the buttons are %q", got)
	}
}

func TestRetryFailedWaitsForASongThatFailed(t *testing.T) {
	m, _ := started(t)
	m = download(m)
	for _, b := range m.buttons() {
		if b.entry == entryRetry && !b.disabled {
			t.Error("Retry failed can be used with nothing failed")
		}
	}
}

func TestANewListSaysWhereTheSavedOneWentAndNothingForAListThatWasNeverSaved(t *testing.T) {
	m := listOf("https://a")
	next, _ := m.Update(entryChosenMsg{entryNew})
	if got := next.(Model).done; got != "" {
		t.Errorf("a list that was never saved says %q", got)
	}
	if err := m.session.Save(filepath.Join(t.TempDir(), "mix.mvd")); err != nil {
		t.Fatal(err)
	}
	next, _ = m.Update(entryChosenMsg{entryNew})
	if got := next.(Model).done; !strings.Contains(got, "mix.mvd is kept") {
		t.Errorf("a saved list is not said to be kept: %q", got)
	}
}
