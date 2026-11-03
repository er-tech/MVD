package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
)

// addingRun is a fake run that takes more links, and remembers them.
type addingRun struct {
	*fakeRun
	added []string
}

func (a *addingRun) AddSource(url string) (engine.PlaylistSource, bool) {
	a.added = append(a.added, url)

	return engine.PlaylistSource{Index: len(a.added), URL: url}, true
}

func autoLoadHost(t *testing.T, run ListRun) Host {
	t.Helper()
	host, _ := newListHost(t, newFakeRun())
	host.AutoLoad = true
	host.Start = func(config.Config, []string, []engine.PlannedEntry, bool) (ListRun, error) { return run, nil }

	return host
}

func TestALinkIsLoadedInTheBackgroundAsSoonAsItIsThere(t *testing.T) {
	m := sized(New(autoLoadHost(t, newFakeRun()), config.Config{OutputDir: t.TempDir()}, downloadlist.New([]string{"https://youtu.be/x"})))
	if !m.life.Starting {
		t.Fatal("a list with a link did not begin to load by itself")
	}
	empty := sized(New(autoLoadHost(t, newFakeRun()), config.Config{OutputDir: t.TempDir()}, downloadlist.New(nil)))
	if empty.life.Starting {
		t.Error("an empty list began to load")
	}
}

func TestAListThatWasStoppedIsNotLoadedAgainUntilItChanges(t *testing.T) {
	fake := newFakeRun()
	m := sized(New(autoLoadHost(t, fake), config.Config{OutputDir: t.TempDir()}, downloadlist.New([]string{"https://youtu.be/x"})))
	m = m.runStartedFor(t, fake)
	m, _ = m.stop(false)
	next, _ := m.Update(runClosedMsg{})
	m = next.(Model)
	if m.life.Starting || m.running() {
		t.Error("a stopped list began to load again by itself")
	}
}

func (m Model) runStartedFor(t *testing.T, run ListRun) Model {
	t.Helper()
	next, _ := m.Update(runStartedMsg{run: run})

	return next.(Model)
}

// twoLinkRun is a fake run with two links, that remembers which was taken out.
type twoLinkRun struct {
	*addingRun
	removed []int
}

func (r *twoLinkRun) Sources() []engine.PlaylistSource {
	return []engine.PlaylistSource{{Index: 0, URL: "https://youtu.be/a"}, {Index: 1, URL: "https://youtu.be/b"}}
}

func (r *twoLinkRun) RemoveSource(playlist int) bool {
	r.removed = append(r.removed, playlist)
	return true
}

func TestALinkCanBeTakenOutWhileTheRunGoesOn(t *testing.T) {
	run := &twoLinkRun{addingRun: &addingRun{fakeRun: newFakeRun()}}
	list := downloadlist.New([]string{"https://youtu.be/a", "https://youtu.be/b"})
	m := sized(New(autoLoadHost(t, run), config.Config{OutputDir: t.TempDir()}, list))
	m = m.runStartedFor(t, run)

	next, _ := m.Update(listEdit{op: "remove", index: 1})
	m = next.(Model)
	if len(run.removed) != 1 || run.removed[0] != 1 {
		t.Errorf("the run was told to remove %v", run.removed)
	}
	if got := addressesOf(m); len(got) != 1 || got[0] != "https://youtu.be/a" {
		t.Errorf("the list has %v", got)
	}
	if m.life.Starting || !m.running() {
		t.Error("taking a link out must not restart the run")
	}
}

// busyRun is a fake run with songs that are downloading.
type busyRun struct{ *addingRun }

func (busyRun) Sources() []engine.PlaylistSource {
	return []engine.PlaylistSource{{Index: 0, URL: "https://youtu.be/a"}}
}

func TestTheCloseQuestionGoesWhenTheLastSongIsDone(t *testing.T) {
	run := busyRun{&addingRun{fakeRun: newFakeRun()}}
	list := downloadlist.New([]string{"https://youtu.be/a"})
	m := sized(New(autoLoadHost(t, run), config.Config{OutputDir: t.TempDir()}, list))
	m = m.runStartedFor(t, run)
	m.dl.State.Apply(engine.EvPlaylistListed{Playlist: 0, Title: "A", Entries: []engine.EntryInfo{{ID: 0, Playlist: 0, Index: 1}}})
	m.dl.State.Apply(engine.EvEntryState{Entry: 0, State: engine.StateDownloading, TargetID: "abc12345678"})
	next, _ := m.Update(CloseRequestedMsg{})
	m = next.(Model)
	if !m.closing.On {
		t.Fatal("a close while downloading did not ask")
	}

	m.dl.State.Apply(engine.EvEntryState{Entry: 0, State: engine.StateDone, TargetID: "abc12345678"})
	next, cmd := m.Update(program.WindowSizeMsg{Width: 100, Height: 30})
	if next.(Model).closing.On || cmd == nil {
		t.Errorf("the question stayed after the last song finished (on %v, cmd %v)", next.(Model).closing.On, cmd != nil)
	}
}
