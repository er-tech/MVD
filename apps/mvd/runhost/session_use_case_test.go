package runhost

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

// fakeEngine is an engine with no yt-dlp: the test sends its events and reads what it was asked.
type fakeEngine struct {
	events chan interface{}
	// sendMu keeps a send from meeting the close of the channel, as the real engine does.
	sendMu sync.Mutex
	closed bool

	mu          sync.Mutex
	sources     []engine.PlaylistSource
	released    []int
	releasedAll int
	resumed     int
	paused      int
	removed     []int
}

func newFakeEngine(urls ...string) *fakeEngine {
	f := &fakeEngine{events: make(chan interface{}, 4)}
	for i, url := range urls {
		f.sources = append(f.sources, engine.PlaylistSource{Index: i, URL: url})
	}

	return f
}

func (f *fakeEngine) Events() <-chan interface{} { return f.events }
func (f *fakeEngine) Run(ctx context.Context) {
	<-ctx.Done()
	f.sendMu.Lock()
	f.closed = true
	close(f.events)
	f.sendMu.Unlock()
}

// send puts an event on the channel, or drops it once the engine has ended.
func (f *fakeEngine) send(ev interface{}) {
	f.sendMu.Lock()
	defer f.sendMu.Unlock()
	if !f.closed {
		f.events <- ev
	}
}

func (f *fakeEngine) Sources() []engine.PlaylistSource {
	f.mu.Lock()
	defer f.mu.Unlock()

	return append([]engine.PlaylistSource(nil), f.sources...)
}
func (f *fakeEngine) AddSource(url string) (engine.PlaylistSource, bool) {
	f.mu.Lock()
	src := engine.PlaylistSource{Index: len(f.sources), URL: url}
	f.sources = append(f.sources, src)
	f.mu.Unlock()
	f.send(engine.EvPlaylistAdded{Source: src})

	return src, true
}
func (f *fakeEngine) RemoveSource(playlist int) bool {
	f.mu.Lock()
	f.removed = append(f.removed, playlist)
	f.mu.Unlock()
	f.send(engine.EvPlaylistRemoved{Playlist: playlist})

	return true
}
func (f *fakeEngine) Release(entry int, _ string) bool {
	f.mu.Lock()
	f.released = append(f.released, entry)
	f.mu.Unlock()
	f.send(engine.EvEntryState{Entry: entry, State: engine.StateAccepted})

	return true
}
func (f *fakeEngine) ReleaseAll() int {
	f.mu.Lock()
	f.releasedAll++
	f.mu.Unlock()
	// A full channel blocks here until the pump reads: the session must not hold up the pump.
	for i := 0; i < 20; i++ {
		f.send(engine.EvLog{Playlist: 0, Entry: -1, Line: "released"})
	}

	return 1
}
func (f *fakeEngine) Pause()                           { f.mu.Lock(); f.paused++; f.mu.Unlock() }
func (f *fakeEngine) Resume()                          { f.mu.Lock(); f.resumed++; f.mu.Unlock() }
func (f *fakeEngine) RetryAll() int                    { return 0 }
func (f *fakeEngine) Snapshot() []engine.EntrySnapshot { return nil }
func (f *fakeEngine) releasedIDs() []int {
	f.mu.Lock()
	defer f.mu.Unlock()

	return append([]int(nil), f.released...)
}

func newSession(t *testing.T) (*Session, *library.Store, *fakeEngine, context.CancelFunc) {
	t.Helper()
	store := library.NewStore()
	fake := newFakeEngine()
	ctx, cancel := context.WithCancel(context.Background())
	build := func(_ context.Context, _ config.Config, sources []string, _ []engine.PlannedEntry) (Engine, error) {
		for i, url := range sources {
			fake.sources = append(fake.sources, engine.PlaylistSource{Index: i, URL: url})
		}

		return fake, nil
	}
	session := New(ctx, store, build, func() config.Config { return config.Config{} }, "")
	t.Cleanup(cancel)

	return session, store, fake, cancel
}

func eventually(t *testing.T, what string, ok func() bool) {
	t.Helper()
	for deadline := time.Now().Add(3 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		if ok() {
			return
		}
	}
	t.Fatalf("timed out waiting for %s", what)
}

func listed(playlist int, title string, ids ...int) engine.EvPlaylistListed {
	ev := engine.EvPlaylistListed{Playlist: playlist, Title: title}
	for i, id := range ids {
		ev.Entries = append(ev.Entries, engine.EntryInfo{ID: id, Playlist: playlist, Index: i + 1, VideoID: "vid" + string(rune('a'+id)), Title: "Song", Channel: "Chan"})
	}

	return ev
}

func TestAddingALinkShowsASourceAtOnce(t *testing.T) {
	session, store, _, _ := newSession(t)
	if err := session.AddSource("https://example.com/list"); err != nil {
		t.Fatal(err)
	}
	state := store.State()
	if len(state.Sources) != 1 || state.Sources[0].Status != "listing" || state.Run.Phase != "loading" {
		t.Fatalf("state %+v, want one source listing and a loading run", state)
	}
}

func TestEmptyAndRepeatedLinksAreRefused(t *testing.T) {
	session, _, _, _ := newSession(t)
	if err := session.AddSource("   "); err == nil {
		t.Fatal("an empty link was accepted")
	}
	if err := session.AddSource("https://example.com/list"); err != nil {
		t.Fatal(err)
	}
	if err := session.AddSource(" https://example.com/list "); !errors.Is(err, ErrAlreadyListed) {
		t.Fatalf("got %v, want ErrAlreadyListed", err)
	}
}

func TestALinkAddedWhileTheEngineRunsGoesToTheEngine(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/one")
	_ = session.AddSource("https://example.com/two")
	eventually(t, "two sources", func() bool { return len(store.State().Sources) == 2 })
	if got := len(fake.Sources()); got != 2 {
		t.Fatalf("engine has %d sources, want 2", got)
	}
}

func TestAListedSourceShowsItsSongsAndCounts(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0, 1, 2)
	eventually(t, "the songs", func() bool {
		s := store.State()
		return len(s.Songs) == 3 && len(s.Sources) == 1 && s.Sources[0].Title == "My list" && s.Sources[0].Songs == 3
	})
	if source := store.State().Sources[0]; source.Status != "listed" {
		t.Fatalf("source %+v, want listed", source)
	}
}

func TestNothingIsReleasedBeforeStart(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0)
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StatePlanned, TargetID: "x"}
	eventually(t, "the planned song", func() bool {
		s := store.State()
		return len(s.Songs) == 1 && s.Songs[0].Status != "waiting"
	})
	time.Sleep(50 * time.Millisecond)
	if got := fake.releasedIDs(); len(got) != 0 {
		t.Fatalf("released %v before Start", got)
	}
}

func TestStartReleasesWhatIsReadyAndThenEachSongThatBecomesReady(t *testing.T) {
	session, _, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0, 1)
	if err := session.Start(); err != nil {
		t.Fatal(err)
	}
	eventually(t, "ReleaseAll", func() bool {
		fake.mu.Lock()
		defer fake.mu.Unlock()
		return fake.releasedAll == 1 && fake.resumed == 1
	})
	fake.events <- engine.EvEntryState{Entry: 1, State: engine.StatePlanned, TargetID: "x"}
	eventually(t, "the late song released", func() bool {
		ids := fake.releasedIDs()
		return len(ids) == 1 && ids[0] == 1
	})
}

func TestStartWithNothingAddedIsRefused(t *testing.T) {
	session, _, _, _ := newSession(t)
	if err := session.Start(); err == nil {
		t.Fatal("Start with no link was accepted")
	}
}

func TestTheRunMovesFromLoadingToReadyToDownloading(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0)
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StatePlanned, TargetID: "x"}
	eventually(t, "ready", func() bool { return store.State().Run.Phase == "ready" })
	_ = session.Start()
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StateDownloading, TargetID: "x"}
	eventually(t, "downloading", func() bool { return store.State().Run.Phase == "downloading" })
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StateDone, TargetID: "x"}
	fake.events <- engine.EvIdle{}
	eventually(t, "finished", func() bool {
		run := store.State().Run
		return run.Phase == "finished" && run.Done == 1
	})
}

func TestRemovingASourceRemovesItsSongs(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0, 1)
	eventually(t, "the songs", func() bool { return len(store.State().Songs) == 2 })
	if err := session.RemoveSource("p0"); err != nil {
		t.Fatal(err)
	}
	eventually(t, "nothing left", func() bool {
		s := store.State()
		return len(s.Songs) == 0 && len(s.Sources) == 0
	})
	if err := session.RemoveSource("p0"); err == nil {
		t.Fatal("removing a source twice was accepted")
	}
	if err := session.AddSource("https://example.com/list"); err != nil {
		t.Fatalf("a removed link could not be added again: %v", err)
	}
}

func TestDetailOfASongHasItsLinks(t *testing.T) {
	session, _, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0)
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StatePlanned, TargetID: "official1", Official: true, Reason: "official video of the song"}
	eventually(t, "the official video", func() bool {
		d, err := session.Detail("song", "e0")
		return err == nil && len(d.Links) == 2
	})
	detail, _ := session.Detail("song", "e0")
	if detail.Links[0].URL != watchURL+"vida" || detail.Links[1].URL != watchURL+"official1" || detail.Links[1].Label != "Official video found" {
		t.Fatalf("links %+v", detail.Links)
	}
	if detail.Kind != "song" || detail.ID != "e0" {
		t.Fatalf("detail %+v", detail)
	}
}

func TestDetailOfASourceHasItsLink(t *testing.T) {
	session, _, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0)
	eventually(t, "the title", func() bool {
		d, err := session.Detail("source", "p0")
		return err == nil && d.Title == "My list"
	})
	detail, _ := session.Detail("source", "p0")
	if len(detail.Links) != 1 || detail.Links[0].URL != "https://example.com/list" {
		t.Fatalf("links %+v", detail.Links)
	}
}

func TestDetailOfSomethingUnknownIsAnError(t *testing.T) {
	session, _, _, _ := newSession(t)
	if _, err := session.Detail("song", "e0"); err == nil {
		t.Fatal("a detail with no list was returned")
	}
	_ = session.AddSource("https://example.com/list")
	for _, c := range [][2]string{{"song", "e9"}, {"song", "zzz"}, {"source", "p9"}, {"thing", "p0"}} {
		if _, err := session.Detail(c[0], c[1]); err == nil {
			t.Fatalf("detail of %v was returned", c)
		}
	}
}

func TestStartDoesNotStopWhenTheEngineSendsMoreEventsThanTheChannelHolds(t *testing.T) {
	session, _, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/list")
	done := make(chan struct{})
	go func() {
		_ = session.Start()
		session.Pause()
		session.Resume()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("the session stopped")
	}
	eventually(t, "ReleaseAll and its events", func() bool {
		fake.mu.Lock()
		defer fake.mu.Unlock()
		return fake.releasedAll == 1
	})
}

func TestTheSessionEndsWhenItsContextEnds(t *testing.T) {
	session, _, _, cancel := newSession(t)
	_ = session.AddSource("https://example.com/list")
	cancel()
	if !session.Wait(2 * time.Second) {
		t.Fatal("the engine did not stop")
	}
}

func TestWaitWithNoEngineReturnsAtOnce(t *testing.T) {
	session, _, _, _ := newSession(t)
	if !session.Wait(time.Millisecond) {
		t.Fatal("Wait with no engine did not return true")
	}
}

func TestASongThatWaitsIsNotCountedAsSavedAndASingleSongNamesItsSource(t *testing.T) {
	session, store, fake, _ := newSession(t)
	_ = session.AddSource("https://example.com/one")
	ev := listed(0, "https://example.com/one", 0)
	ev.Entries[0].Title = "The Song"
	fake.events <- ev
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StatePlanned, TargetID: "x"}
	eventually(t, "the source summary", func() bool {
		s := store.State()
		return len(s.Sources) == 1 && s.Sources[0].Songs == 1 && s.Sources[0].Title == "The Song"
	})
	if done := store.State().Sources[0].Done; done != 0 {
		t.Fatalf("source says %d saved for a song that only waits", done)
	}
}

func TestAFailedSongTellsTheFailureCallback(t *testing.T) {
	session, _, fake, _ := newSession(t)
	failures := make(chan struct{}, 4)
	session.OnFailure(func() { failures <- struct{}{} })
	_ = session.AddSource("https://example.com/list")
	fake.events <- listed(0, "My list", 0)
	fake.events <- engine.EvEntryState{Entry: 0, State: engine.StateFailed, Err: "boom"}
	select {
	case <-failures:
	case <-time.After(2 * time.Second):
		t.Fatal("the failure was not reported")
	}
}
