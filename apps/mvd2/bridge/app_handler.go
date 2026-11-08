package bridge

import (
	"context"
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"github.com/er-tech/MVD/apps/mvd2/preferences"
	"github.com/er-tech/MVD/apps/mvd2/runhost"
	"github.com/er-tech/MVD/libs/mvd-state/changefeed"
	"github.com/er-tech/MVD/libs/mvd-state/library"
)

// RowsEvent is the name of the event that carries a library.Batch to the page.
const RowsEvent = "rows"

const (
	flushEvery  = 100 * time.Millisecond
	stopTimeout = 2 * time.Second
)

// Host is what the app asks of the operating system and of the window. The shell fills it with the
// Wails runtime, so this package never imports it and a test fills it with fakes. A nil function
// does nothing, or says "not offered".
type Host struct {
	// Emit sends a batch of changes to the page, with the context Startup received.
	Emit func(context.Context, library.Batch)
	// PickListFile asks for a .mvd file to open, and returns "" when the person cancels.
	PickListFile func(context.Context) (string, error)
	// PickSaveFile asks where to save a .mvd file, starting with the file name name, and returns ""
	// when the person cancels.
	PickSaveFile func(ctx context.Context, name string) (string, error)
	// PickFolder asks for a folder, starting in start, and returns "" when the person cancels.
	PickFolder func(ctx context.Context, start string) (string, error)
	// OpenLink opens an address in the browser.
	OpenLink func(ctx context.Context, url string)
	// OpenFolder shows a folder in the file manager.
	OpenFolder func(path string) error
	// Quit closes the window.
	Quit func(context.Context)
	// AskClose tells the page the window wants to close while downloads run, so it asks the person.
	AskClose func(context.Context)
	// Tools says whether the download tools are ready. Nil means they always are.
	Tools func() Tools
}

// App is what Wails binds: its exported methods are what the page can call. It holds no logic of its
// own: each method hands the work to the session, the preferences or the host, and returns at once.
type App struct {
	store   *library.Store
	session *runhost.Session
	prefs   *preferences.Store
	host    Host
	version string
	cancel  context.CancelFunc
	// confirmed is set once the person agreed to quit while downloads run.
	confirmed atomic.Bool

	mu       sync.Mutex
	ctx      context.Context
	stopFeed context.CancelFunc
	log      *os.File
}

// New returns an App for the session, which writes to the store the app reads.
//
// store is the list the page shows, session fills it, prefs holds the settings, host reaches the
// system and cancel ends the session's context. version is the version of the app, for the About
// window.
func New(store *library.Store, session *runhost.Session, prefs *preferences.Store, host Host, version string, cancel context.CancelFunc) *App {
	return &App{store: store, session: session, prefs: prefs, host: host, version: version, cancel: cancel}
}

// Startup starts the change feed that tells the page what changed. Wails calls it once, with the
// context the runtime functions need.
func (a *App) Startup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	if path := os.Getenv("MVD2_LOG"); path != "" {
		a.log, _ = os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	}
	a.mu.Unlock()
	feed, stop := context.WithCancel(ctx)
	a.mu.Lock()
	a.stopFeed = stop
	a.mu.Unlock()
	go changefeed.Run(feed, a.store, flushEvery, func(batch library.Batch) {
		if a.host.Emit != nil {
			a.host.Emit(ctx, batch)
		}
	})
}

// BeforeClose, while downloads run, keeps the window open and asks the page to ask the person. Once the
// person agrees, or when nothing downloads, it ends the session, waits up to two seconds for the engine to stop its programs, and
// lets the window close. Wails calls it when the person closes the window. It reports the time it
// took when MVD2_LOG is set.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	if run := a.store.State().Run; !a.confirmed.Load() && a.host.AskClose != nil && run.Started && run.Phase == "downloading" {
		a.host.AskClose(ctx)

		return true
	}
	started := time.Now()
	a.mu.Lock()
	stopFeed := a.stopFeed
	a.mu.Unlock()
	if stopFeed != nil {
		stopFeed()
	}
	a.cancel()
	stopped := a.session.Wait(stopTimeout)
	left := 0
	if !stopped {
		left = 1
	}
	a.write("close", float64(time.Since(started).Milliseconds()), left)

	return false
}

// GetState returns every source and song and the revision they are at. The page calls it when it
// starts and when it finds that it missed a batch.
func (a *App) GetState() library.State {
	return a.store.State()
}

// Version is the version of the app.
func (a *App) Version() string {
	return a.version
}

// Metric records a measure the page took, in the file MVD2_LOG names. It does nothing when the
// variable is not set.
//
// name says what was measured and value is the measure.
func (a *App) Metric(name string, value float64) {
	a.write(name, value, 0)
}

func (a *App) write(name string, value float64, extra int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.log == nil {
		return
	}
	_, _ = fmt.Fprintf(a.log, "%s %s %.1f %d\n", time.Now().Format("15:04:05.000"), name, value, extra)
}

// context is the context of the window, or the background one before Startup.
func (a *App) context() context.Context {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.ctx == nil {
		return context.Background()
	}

	return a.ctx
}
