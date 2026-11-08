package simulation

import (
	"context"
	"testing"
	"time"

	"github.com/er-tech/MVD/libs/mvd-state/songrows"
)

func TestChurnMakesTheRowsAtOnceAndKeepsChangingThem(t *testing.T) {
	store := songrows.NewStore()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		Churn(ctx, store, 300, 50, 5*time.Millisecond)
		close(done)
	}()
	time.Sleep(80 * time.Millisecond)
	cancel()
	<-done
	state := store.State()
	if len(state.Rows) != 300 {
		t.Fatalf("%d rows, want 300", len(state.Rows))
	}
	if state.Revision <= 300 {
		t.Fatalf("revision %d: the rows never changed after they were made", state.Revision)
	}
}

func TestChurnStopsWhenTheContextEnds(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		Churn(ctx, songrows.NewStore(), 10, 1, time.Hour)
		close(done)
	}()
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Churn did not return")
	}
}
