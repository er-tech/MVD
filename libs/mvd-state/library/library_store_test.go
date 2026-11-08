package library

import (
	"fmt"
	"sync"
	"testing"
)

func TestManyChangesToOneSongGiveOneUpsertWithTheNewestValue(t *testing.T) {
	s := NewStore()
	for p := 0; p <= 50; p++ {
		s.SetSong(Song{ID: "a", Percent: p})
	}
	batch, ok := s.Drain()
	if !ok || len(batch.Songs.Upserts) != 1 || batch.Songs.Upserts[0].Percent != 50 {
		t.Fatalf("batch %+v, want one upsert at 50", batch)
	}
}

func TestARowEqualToTheHeldOneIsNotAChange(t *testing.T) {
	s := NewStore()
	s.SetSong(Song{ID: "a", Title: "x"})
	s.SetSource(Source{ID: "s", Title: "y"})
	s.Drain()
	s.SetSong(Song{ID: "a", Title: "x"})
	s.SetSource(Source{ID: "s", Title: "y"})
	if _, ok := s.Drain(); ok {
		t.Fatal("an equal row made a batch")
	}
}

func TestNothingChangedMeansNothingToDrain(t *testing.T) {
	if _, ok := NewStore().Drain(); ok {
		t.Fatal("an empty store made a batch")
	}
}

func TestARemovedSongIsListedOnceAndNotAsAnUpsert(t *testing.T) {
	s := NewStore()
	s.SetSong(Song{ID: "a", SourceID: "s"})
	s.SetSource(Source{ID: "s"})
	s.Drain()
	s.SetSong(Song{ID: "a", SourceID: "s", Percent: 5})
	s.RemoveSource("s")
	batch, _ := s.Drain()
	if len(batch.Songs.Upserts) != 0 || len(batch.Songs.Removed) != 1 || batch.Songs.Removed[0] != "a" {
		t.Fatalf("songs %+v, want only the removal of a", batch.Songs)
	}
	if len(batch.Sources.Removed) != 1 || batch.Sources.Removed[0] != "s" {
		t.Fatalf("sources %+v, want the removal of s", batch.Sources)
	}
}

func TestRemovingASourceTakesOnlyItsOwnSongs(t *testing.T) {
	s := NewStore()
	s.SetSource(Source{ID: "s1"})
	s.SetSource(Source{ID: "s2"})
	s.SetSong(Song{ID: "a", SourceID: "s1"})
	s.SetSong(Song{ID: "b", SourceID: "s2"})
	s.RemoveSource("s1")
	state := s.State()
	if len(state.Sources) != 1 || state.Sources[0].ID != "s2" || len(state.Songs) != 1 || state.Songs[0].ID != "b" {
		t.Fatalf("state %+v, want s2 and b only", state)
	}
}

func TestRemovingASourceTheStoreDoesNotHoldChangesNothing(t *testing.T) {
	s := NewStore()
	s.SetSong(Song{ID: "a"})
	s.Drain()
	s.RemoveSource("nothing")
	if _, ok := s.Drain(); ok {
		t.Fatal("removing an unknown source made a batch")
	}
}

func TestClearDropsEverythingInOneChange(t *testing.T) {
	s := NewStore()
	s.SetSource(Source{ID: "s"})
	s.SetSong(Song{ID: "a", SourceID: "s"})
	s.Drain()
	s.Clear()
	batch, ok := s.Drain()
	if !ok || len(batch.Sources.Removed) != 1 || len(batch.Songs.Removed) != 1 {
		t.Fatalf("batch %+v, want both rows removed", batch)
	}
	if state := s.State(); len(state.Sources)+len(state.Songs) != 0 {
		t.Fatalf("state %+v, want empty", state)
	}
}

func TestRowsKeepTheOrderTheyCameInWhateverChanges(t *testing.T) {
	s := NewStore()
	for _, id := range []string{"c", "a", "b"} {
		s.SetSong(Song{ID: id})
	}
	s.SetSong(Song{ID: "c", Percent: 9})
	var got []string
	for _, r := range s.State().Songs {
		got = append(got, r.ID)
	}
	if fmt.Sprint(got) != "[c a b]" {
		t.Fatalf("order %v, want [c a b]", got)
	}
}

func TestANewRowArrivesInTheBatchInTheOrderItWasAdded(t *testing.T) {
	s := NewStore()
	for _, id := range []string{"c", "a", "b"} {
		s.SetSong(Song{ID: id})
	}
	batch, _ := s.Drain()
	var got []string
	for _, r := range batch.Songs.Upserts {
		got = append(got, r.ID)
	}
	if fmt.Sprint(got) != "[c a b]" {
		t.Fatalf("batch order %v, want [c a b]", got)
	}
}

func TestBatchesFollowEachOtherWithoutAGapAndMatchTheState(t *testing.T) {
	s := NewStore()
	s.SetSong(Song{ID: "a"})
	first, _ := s.Drain()
	s.SetSource(Source{ID: "b"})
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
				s.SetSong(Song{ID: fmt.Sprintf("%d-%d", w, i)})
			}
		}(w)
	}
	seen := map[string]bool{}
	collect := func() {
		if batch, ok := s.Drain(); ok {
			for _, r := range batch.Songs.Upserts {
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

func TestARunChangeIsInTheBatchOnlyWhenItChanged(t *testing.T) {
	s := NewStore()
	s.SetRun(Run{Phase: "loading"})
	first, _ := s.Drain()
	if first.Run == nil || first.Run.Phase != "loading" {
		t.Fatalf("batch %+v, want the run", first)
	}
	s.SetSong(Song{ID: "a"})
	second, _ := s.Drain()
	if second.Run != nil {
		t.Fatalf("batch %+v, want no run", second)
	}
	s.SetRun(Run{Phase: "loading"})
	if _, ok := s.Drain(); ok {
		t.Fatal("an equal run made a batch")
	}
	if s.State().Run.Phase != "loading" {
		t.Fatalf("state %+v, want the run", s.State())
	}
}

func TestANewStoreStartsWithAnEmptyRun(t *testing.T) {
	if got := NewStore().State().Run.Phase; got != "empty" {
		t.Fatalf("phase %q, want empty", got)
	}
}
