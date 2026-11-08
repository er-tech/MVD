package songrows

import (
	"fmt"
	"sync"
	"testing"
)

func TestManyChangesToOneRowGiveOneUpsertWithTheNewestValue(t *testing.T) {
	s := NewStore()
	for p := 0; p <= 50; p++ {
		s.Set(Row{ID: "a", Percent: p})
	}
	batch, ok := s.Drain()
	if !ok || len(batch.Upserts) != 1 || batch.Upserts[0].Percent != 50 {
		t.Fatalf("batch %+v, want one upsert at 50", batch)
	}
}

func TestARowEqualToTheHeldOneIsNotAChange(t *testing.T) {
	s := NewStore()
	s.Set(Row{ID: "a", Title: "x"})
	s.Drain()
	s.Set(Row{ID: "a", Title: "x"})
	if _, ok := s.Drain(); ok {
		t.Fatal("an equal row made a batch")
	}
}

func TestNothingChangedMeansNothingToDrain(t *testing.T) {
	if _, ok := NewStore().Drain(); ok {
		t.Fatal("an empty store made a batch")
	}
}

func TestARemovedRowIsListedOnceAndNotAsAnUpsert(t *testing.T) {
	s := NewStore()
	s.Set(Row{ID: "a"})
	s.Drain()
	s.Set(Row{ID: "a", Percent: 5})
	s.Remove("a")
	batch, _ := s.Drain()
	if len(batch.Upserts) != 0 || len(batch.Removed) != 1 || batch.Removed[0] != "a" {
		t.Fatalf("batch %+v, want only the removal of a", batch)
	}
}

func TestRowsKeepTheOrderTheyCameInWhateverChanges(t *testing.T) {
	s := NewStore()
	for _, id := range []string{"c", "a", "b"} {
		s.Set(Row{ID: id})
	}
	s.Set(Row{ID: "c", Percent: 9})
	var got []string
	for _, r := range s.State().Rows {
		got = append(got, r.ID)
	}
	if fmt.Sprint(got) != "[c a b]" {
		t.Fatalf("order %v, want [c a b]", got)
	}
}

func TestBatchesFollowEachOtherWithoutAGapAndMatchTheState(t *testing.T) {
	s := NewStore()
	s.Set(Row{ID: "a"})
	first, _ := s.Drain()
	s.Set(Row{ID: "b"})
	second, _ := s.Drain()
	if first.To != second.From || s.State().Revision != second.To {
		t.Fatalf("revisions %d..%d then %d..%d, state %d", first.From, first.To, second.From, second.To, s.State().Revision)
	}
}

func TestWritersAndADrainerTogetherLoseNoRow(t *testing.T) {
	s := NewStore()
	var wg sync.WaitGroup
	for w := 0; w < 8; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			for i := 0; i < 500; i++ {
				s.Set(Row{ID: fmt.Sprintf("%d-%d", w, i)})
			}
		}(w)
	}
	seen := map[string]bool{}
	collect := func() {
		if batch, ok := s.Drain(); ok {
			for _, r := range batch.Upserts {
				seen[r.ID] = true
			}
		}
	}
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	for running := true; running; {
		select {
		case <-done:
			running = false
		default:
			collect()
		}
	}
	collect()
	if len(seen) != 4000 {
		t.Fatalf("saw %d rows, want 4000", len(seen))
	}
}
