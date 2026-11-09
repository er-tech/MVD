package library

import "sync"

// Store keeps the sources and songs, a revision that grows with each change, and the rows changed
// since the last drain. It is safe for many goroutines. The zero value is not ready: use NewStore.
type Store struct {
	mu       sync.Mutex
	sources  *table[Source]
	songs    *table[Song]
	run      Run
	runDirty bool
	revision uint64
	drained  uint64
}

// NewStore returns an empty store at revision 0.
func NewStore() *Store {
	return &Store{sources: newTable[Source](), songs: newTable[Song](), run: Run{Phase: "empty"}}
}

// SetSource adds the source or replaces the one with the same ID. A source equal to the one held is
// not a change: the revision stays and nothing is queued, so a writer may repeat itself for free. The
// store keeps the Position of a source it holds, and gives a new one the place after the last.
func (s *Store) SetSource(source Source) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if held, found := s.sources.rows[source.ID]; found {
		source.Position = held.Position
	} else {
		source.Position = len(s.sources.order) + 1
	}
	if s.sources.set(source.ID, source) {
		s.revision++
	}
}

// SetSong adds the song or replaces the one with the same ID, with the same rule as SetSource.
func (s *Store) SetSong(song Song) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.songs.set(song.ID, song) {
		s.revision++
	}
}

// SetRun replaces the state of the run. A run equal to the one held is not a change.
func (s *Store) SetRun(run Run) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.run == run {
		return
	}
	s.run = run
	s.runDirty = true
	s.revision++
}

// RemoveSource drops the source and every song of it, in one change. An ID the store does not hold
// changes nothing.
func (s *Store) RemoveSource(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	gone := map[string]struct{}{}
	for songID, song := range s.songs.rows {
		if song.SourceID == id {
			gone[songID] = struct{}{}
		}
	}
	removedSource := s.sources.remove(map[string]struct{}{id: {}})
	removedSongs := s.songs.remove(gone)
	renumbered := s.renumber()
	if removedSource || removedSongs || renumbered {
		s.revision++
	}
}

// MoveSource puts the source at place to (from 1, a place past either end is the end) and gives every
// source the Position of its new place. It says false when the store holds no such source or the
// place does not change.
func (s *Store) MoveSource(id string, to int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.sources.move(id, to-1) {
		return false
	}
	s.renumber()
	s.revision++

	return true
}

// renumber gives each source the Position of its place and says whether any changed.
func (s *Store) renumber() bool {
	changed := false
	for at, id := range s.sources.order {
		row := s.sources.rows[id]
		if row.Position != at+1 {
			row.Position = at + 1
			s.sources.set(id, row)
			changed = true
		}
	}

	return changed
}

// Clear drops everything, in one change.
func (s *Store) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	sources := map[string]struct{}{}
	for id := range s.sources.rows {
		sources[id] = struct{}{}
	}
	songs := map[string]struct{}{}
	for id := range s.songs.rows {
		songs[id] = struct{}{}
	}
	removedSources := s.sources.remove(sources)
	removedSongs := s.songs.remove(songs)
	if removedSources || removedSongs {
		s.revision++
	}
}

// State returns everything and the revision it is at, for a page that has just started or has
// missed a batch.
func (s *Store) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()

	return State{Revision: s.revision, Sources: s.sources.all(), Songs: s.songs.all(), Run: s.run}
}

// Drain returns the changes since the last drain and false when there are none. Each row appears
// once, with its newest value, however many times it changed.
func (s *Store) Drain() (Batch, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.revision == s.drained {
		return Batch{}, false
	}
	batch := Batch{From: s.drained, To: s.revision, Sources: s.sources.drain(), Songs: s.songs.drain()}
	if s.runDirty {
		run := s.run
		batch.Run = &run
		s.runDirty = false
	}
	s.drained = s.revision

	return batch, true
}
