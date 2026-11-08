package bridge

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/er-tech/MVD/libs/mvd-state/songrows"
)

type recorder struct {
	mu      sync.Mutex
	batches []songrows.Batch
}

func (r *recorder) emit(_ context.Context, b songrows.Batch) {
	r.mu.Lock()
	r.batches = append(r.batches, b)
	r.mu.Unlock()
}

func (r *recorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.batches)
}

func TestStartupFillsTheStateAndTellsThePageOfChanges(t *testing.T) {
	var rec recorder
	app := New(rec.emit)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	app.Startup(ctx)
	time.Sleep(400 * time.Millisecond)

	if got := len(app.GetState().Rows); got != prototypeLen {
		t.Fatalf("%d rows, want %d", got, prototypeLen)
	}
	if rec.count() == 0 {
		t.Fatal("the page was told nothing")
	}
	app.BeforeClose(ctx)
}

func TestBeforeCloseStopsTheLoadAndLetsTheWindowClose(t *testing.T) {
	var rec recorder
	app := New(rec.emit)
	app.Startup(context.Background())
	time.Sleep(150 * time.Millisecond)

	started := time.Now()
	if app.BeforeClose(context.Background()) {
		t.Fatal("BeforeClose prevented the close")
	}
	if took := time.Since(started); took > 500*time.Millisecond {
		t.Fatalf("close took %v", took)
	}
	time.Sleep(150 * time.Millisecond)
	settled := rec.count()
	time.Sleep(300 * time.Millisecond)
	if rec.count() != settled {
		t.Fatal("the page was still told of changes after the close")
	}
}
