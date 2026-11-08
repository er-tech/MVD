package bridge

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/er-tech/MVD/apps/mvd2/preferences"
	"github.com/er-tech/MVD/apps/mvd2/runhost"
	"github.com/er-tech/MVD/libs/mvd-state/library"
	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"
)

// stubEngine is an engine that does nothing: it lists the links it is given and ends with its context.
type stubEngine struct {
	events  chan interface{}
	sources []engine.PlaylistSource
}

func (e *stubEngine) Events() <-chan interface{}       { return e.events }
func (e *stubEngine) Run(ctx context.Context)          { <-ctx.Done(); close(e.events) }
func (e *stubEngine) Sources() []engine.PlaylistSource { return e.sources }
func (e *stubEngine) AddSource(url string) (engine.PlaylistSource, bool) {
	return engine.PlaylistSource{Index: len(e.sources), URL: url}, true
}
func (e *stubEngine) RemoveSource(int) bool            { return true }
func (e *stubEngine) Release(int, string) bool         { return true }
func (e *stubEngine) ReleaseAll() int                  { return 0 }
func (e *stubEngine) Pause()                           {}
func (e *stubEngine) Resume()                          {}
func (e *stubEngine) RetryAll() int                    { return 0 }
func (e *stubEngine) Snapshot() []engine.EntrySnapshot { return nil }

// recorder keeps what the host was asked.
type recorder struct {
	mu      sync.Mutex
	batches []library.Batch
	links   []string
}

func (r *recorder) emit(_ context.Context, b library.Batch) {
	r.mu.Lock()
	r.batches = append(r.batches, b)
	r.mu.Unlock()
}

func (r *recorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()

	return len(r.batches)
}

func (r *recorder) sources() []library.Source {
	r.mu.Lock()
	defer r.mu.Unlock()
	var all []library.Source
	for _, b := range r.batches {
		all = append(all, b.Sources.Upserts...)
	}

	return all
}

func newApp(t *testing.T, host Host) (*App, *recorder) {
	t.Helper()
	rec := &recorder{}
	if host.Emit == nil {
		host.Emit = rec.emit
	}
	dir := t.TempDir()
	prefs, err := preferences.Open(filepath.Join(dir, "setup.conf"), dir, filepath.Join(dir, "music"))
	if err != nil {
		t.Fatal(err)
	}
	store := library.NewStore()
	ctx, cancel := context.WithCancel(context.Background())
	build := func(_ context.Context, _ config.Config, sources []string, _ []engine.PlannedEntry) (runhost.Engine, error) {
		stub := &stubEngine{events: make(chan interface{}, 8)}
		for i, url := range sources {
			stub.sources = append(stub.sources, engine.PlaylistSource{Index: i, URL: url})
		}

		return stub, nil
	}
	session := runhost.New(ctx, store, build, prefs.Config, filepath.Join(dir, "recovery.mvd"))
	app := New(store, session, prefs, host, "1.2.3", cancel)
	t.Cleanup(func() {
		cancel()
		session.Wait(2 * time.Second)
	})

	return app, rec
}

func TestALinkAddedReachesThePageAsABatch(t *testing.T) {
	app, rec := newApp(t, Host{})
	app.Startup(context.Background())
	if err := app.AddSource("https://example.com/list"); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for len(rec.sources()) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	got := rec.sources()
	if len(got) == 0 || got[0].URL != "https://example.com/list" {
		t.Fatalf("the page was told %+v, want the source", got)
	}
	if state := app.GetState(); len(state.Sources) != 1 || state.Revision == 0 {
		t.Fatalf("state %+v, want one source", state)
	}
}

func TestAnIdleAppTellsThePageNothing(t *testing.T) {
	app, rec := newApp(t, Host{})
	app.Startup(context.Background())
	time.Sleep(350 * time.Millisecond)
	if rec.count() != 0 {
		t.Fatalf("the page was told %d batches with nothing changing", rec.count())
	}
}

func TestBeforeCloseEndsTheSessionQuicklyAndTheFeedStops(t *testing.T) {
	app, rec := newApp(t, Host{})
	app.Startup(context.Background())
	_ = app.AddSource("https://example.com/list")
	time.Sleep(150 * time.Millisecond)

	started := time.Now()
	if app.BeforeClose(context.Background()) {
		t.Fatal("BeforeClose prevented the close")
	}
	if took := time.Since(started); took > time.Second {
		t.Fatalf("close took %v", took)
	}
	time.Sleep(150 * time.Millisecond)
	settled := rec.count()
	time.Sleep(300 * time.Millisecond)
	if rec.count() != settled {
		t.Fatal("the page was still told of changes after the close")
	}
}

func TestOnlyWebAddressesAreOpened(t *testing.T) {
	var opened []string
	app, _ := newApp(t, Host{OpenLink: func(_ context.Context, url string) { opened = append(opened, url) }})
	for _, bad := range []string{"file:///c:/windows/system32/calc.exe", "javascript:alert(1)", "calc.exe", "https://", ""} {
		if err := app.OpenLink(bad); err == nil {
			t.Fatalf("%q was opened", bad)
		}
	}
	if err := app.OpenLink("https://www.youtube.com/watch?v=abc"); err != nil {
		t.Fatal(err)
	}
	if len(opened) != 1 || opened[0] != "https://www.youtube.com/watch?v=abc" {
		t.Fatalf("opened %v, want the one web address", opened)
	}
}

func TestSaveAsWritesTheFileAndSaveKeepsItUpToDate(t *testing.T) {
	path := filepath.Join(t.TempDir(), "mine")
	app, _ := newApp(t, Host{PickSaveFile: func(context.Context, string) (string, error) { return path, nil }})
	if err := app.SaveList(); err == nil {
		t.Fatal("saving a list with no file was accepted")
	}
	if _, err := app.SaveListAs(); err == nil {
		t.Fatal("saving an empty list was accepted")
	}
	_ = app.AddSource("https://example.com/list")
	got, err := app.SaveListAs()
	if err != nil {
		t.Fatal(err)
	}
	if got != path+".mvd" {
		t.Fatalf("saved to %q, want %q", got, path+".mvd")
	}
	if _, err := os.Stat(got); err != nil {
		t.Fatal(err)
	}
	if app.ListPath() != got {
		t.Fatalf("list path %q, want %q", app.ListPath(), got)
	}
	if err := app.SaveList(); err != nil {
		t.Fatal(err)
	}
}

func TestACancelledWindowChangesNothingAndIsNotAnError(t *testing.T) {
	app, _ := newApp(t, Host{
		PickSaveFile: func(context.Context, string) (string, error) { return "", nil },
		PickListFile: func(context.Context) (string, error) { return "", nil },
		PickFolder:   func(context.Context, string) (string, error) { return "", nil },
	})
	_ = app.AddSource("https://example.com/list")
	for name, call := range map[string]func() (string, error){"save": app.SaveListAs, "open": app.OpenListFile, "folder": app.PickOutputFolder} {
		if path, err := call(); path != "" || err != nil {
			t.Fatalf("%s: got %q, %v after a cancel", name, path, err)
		}
	}
	if len(app.GetState().Sources) != 1 {
		t.Fatal("a cancelled window changed the list")
	}
}

func TestAWindowThatFailsReturnsItsError(t *testing.T) {
	app, _ := newApp(t, Host{PickListFile: func(context.Context) (string, error) { return "", errors.New("no display") }})
	if _, err := app.OpenListFile(); err == nil {
		t.Fatal("the error of the window was lost")
	}
}

func TestOpeningAListFileShowsItsSources(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "a.mvd")
	other, _ := newApp(t, Host{PickSaveFile: func(context.Context, string) (string, error) { return first, nil }})
	_ = other.AddSource("https://example.com/saved")
	if _, err := other.SaveListAs(); err != nil {
		t.Fatal(err)
	}
	app, _ := newApp(t, Host{PickListFile: func(context.Context) (string, error) { return first, nil }})
	path, err := app.OpenListFile()
	if err != nil || path != first {
		t.Fatalf("opened %q, %v", path, err)
	}
	if s := app.GetState().Sources; len(s) != 1 || s[0].URL != "https://example.com/saved" {
		t.Fatalf("sources %+v, want the saved one", s)
	}
}

func TestPreferencesAreReadChangedAndRefusedWhenWrong(t *testing.T) {
	app, _ := newApp(t, Host{PickFolder: func(_ context.Context, start string) (string, error) { return start, nil }})
	p := app.GetPreferences()
	p.MaxDownloads = 9
	if err := app.SetPreferences(p); err != nil {
		t.Fatal(err)
	}
	if app.GetPreferences().MaxDownloads != 9 {
		t.Fatal("the change was lost")
	}
	p.MaxDownloads = 0
	if err := app.SetPreferences(p); err == nil {
		t.Fatal("a wrong value was accepted")
	}
	if folder, err := app.PickOutputFolder(); err != nil || folder != app.GetPreferences().OutputDir {
		t.Fatalf("folder %q, %v", folder, err)
	}
	if len(app.GetPreferenceOptions().VideoQualities) == 0 {
		t.Fatal("no options")
	}
}

func TestThereIsNothingToRecoverOnAFreshStart(t *testing.T) {
	app, _ := newApp(t, Host{})
	if app.Recovery() != nil {
		t.Fatal("a recovery was offered on a fresh start")
	}
	if app.Version() != "1.2.3" {
		t.Fatalf("version %q", app.Version())
	}
}

func TestStartWaitsForTheDownloadTools(t *testing.T) {
	ready := false
	app, _ := newApp(t, Host{Tools: func() Tools {
		if ready {
			return Tools{Ready: true}
		}

		return Tools{Message: "Getting the download tools"}
	}})
	if err := app.AddSource("https://example.com/list"); err == nil || err.Error() != "Getting the download tools" {
		t.Fatalf("AddSource before the tools: %v", err)
	}
	if err := app.Start(); err == nil || err.Error() != "Getting the download tools" {
		t.Fatalf("Start before the tools: %v", err)
	}
	ready = true
	if err := app.AddSource("https://example.com/list"); err != nil {
		t.Fatalf("AddSource with the tools: %v", err)
	}
	if err := app.Start(); err != nil {
		t.Fatalf("Start with the tools: %v", err)
	}
}

func TestTheWindowAsksBeforeClosingWhileDownloadsRunAndClosesOnceConfirmed(t *testing.T) {
	asked := 0
	quit := 0
	app, _ := newApp(t, Host{
		AskClose: func(context.Context) { asked++ },
		Quit:     func(context.Context) { quit++ },
	})
	_ = app.AddSource("https://example.com/list")
	if err := app.Start(); err != nil {
		t.Fatal(err)
	}
	// The stub engine never finishes, so the run stays in its phase; force the phase the page sees.
	app.store.SetRun(library.Run{Phase: "downloading", Started: true, Sources: 1})
	if !app.BeforeClose(context.Background()) || asked != 1 {
		t.Fatalf("the close was not held and asked about (asked %d)", asked)
	}
	app.ConfirmQuit()
	if quit != 1 {
		t.Fatalf("quit called %d times, want 1", quit)
	}
	if app.BeforeClose(context.Background()) {
		t.Fatal("the close was held after the person confirmed")
	}
}

func TestTheWindowClosesAtOnceWhenNothingDownloads(t *testing.T) {
	asked := 0
	app, _ := newApp(t, Host{AskClose: func(context.Context) { asked++ }})
	if app.BeforeClose(context.Background()) || asked != 0 {
		t.Fatalf("the close was held with nothing downloading (asked %d)", asked)
	}
}
