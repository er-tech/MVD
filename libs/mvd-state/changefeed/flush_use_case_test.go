package changefeed

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

type batches struct {
	mu   sync.Mutex
	list []library.Batch
}

func (b *batches) add(x library.Batch) { b.mu.Lock(); b.list = append(b.list, x); b.mu.Unlock() }
func (b *batches) all() []library.Batch {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]library.Batch(nil), b.list...)
}

func TestAnIdleStoreEmitsNothing(t *testing.T) {
	var got batches
	ctx, cancel := context.WithCancel(context.Background())
	go Run(ctx, library.NewStore(), 5*time.Millisecond, got.add)
	time.Sleep(60 * time.Millisecond)
	cancel()
	if n := len(got.all()); n != 0 {
		t.Fatalf("%d batches from an idle store", n)
	}
}

func TestAFloodOfChangesBecomesOneBatchWithTheNewestValue(t *testing.T) {
	var got batches
	store := library.NewStore()
	for p := 0; p < 1000; p++ {
		store.SetSong(library.Song{ID: "a", Percent: p})
	}
	ctx, cancel := context.WithCancel(context.Background())
	go Run(ctx, store, 30*time.Millisecond, got.add)
	time.Sleep(90 * time.Millisecond)
	cancel()
	all := got.all()
	if len(all) != 1 || len(all[0].Songs.Upserts) != 1 || all[0].Songs.Upserts[0].Percent != 999 {
		t.Fatalf("batches %+v, want one with percent 999", all)
	}
}

func TestRunStopsWhenTheContextEnds(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})
	go func() {
		Run(ctx, library.NewStore(), time.Hour, func(library.Batch) {})
		close(stopped)
	}()
	cancel()
	select {
	case <-stopped:
	case <-time.After(time.Second):
		t.Fatal("Run did not return")
	}
}
