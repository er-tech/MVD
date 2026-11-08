package bridge

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/er-tech/MVD/apps/mvd2/childprocs"
	"github.com/er-tech/MVD/apps/mvd2/simulation"
	"github.com/er-tech/MVD/libs/mvd-state/changefeed"
	"github.com/er-tech/MVD/libs/mvd-state/songrows"
)

// RowsEvent is the name of the event that carries a songrows.Batch to the page.
const RowsEvent = "rows"

const (
	flushEvery   = 100 * time.Millisecond
	stopTimeout  = 2 * time.Second
	prototypeLen = 5000
)

// App is what Wails binds: its exported methods are what the page can call.
type App struct {
	store *songrows.Store
	procs childprocs.Group
	emit  func(context.Context, songrows.Batch)

	mu     sync.Mutex
	cancel context.CancelFunc
	log    *os.File
}

// New returns an App with no rows. Wails calls Startup when the window is ready.
//
// emit sends a batch of changes to the page, with the context Startup received. The shell passes the
// Wails runtime here, so this package never imports it and a test can pass a recorder.
func New(emit func(context.Context, songrows.Batch)) *App {
	return &App{store: songrows.NewStore(), emit: emit}
}

// Startup starts the prototype load and the change feed that tells the page about it. Wails calls it
// once, with the context the runtime functions need.
func (a *App) Startup(ctx context.Context) {
	run, cancel := context.WithCancel(ctx)
	a.mu.Lock()
	a.cancel = cancel
	if path := os.Getenv("MVD2_LOG"); path != "" {
		a.log, _ = os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	}
	a.mu.Unlock()
	go simulation.Churn(run, a.store, prototypeLen, 500, 50*time.Millisecond)
	go changefeed.Run(run, a.store, flushEvery, func(batch songrows.Batch) {
		a.emit(ctx, batch)
	})
}

// BeforeClose stops the load and every child program, within two seconds, and lets the window close.
// Wails calls it when the user closes the window. It reports the time it took when MVD2_LOG is set.
func (a *App) BeforeClose(context.Context) (prevent bool) {
	started := time.Now()
	a.mu.Lock()
	cancel := a.cancel
	a.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	left := a.procs.Stop(stopTimeout)
	a.write("close", float64(time.Since(started).Milliseconds()), left)
	return false
}

// GetState returns all the rows and their revision. The page calls it when it starts and when it
// finds that it missed a batch.
func (a *App) GetState() songrows.State {
	return a.store.State()
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
