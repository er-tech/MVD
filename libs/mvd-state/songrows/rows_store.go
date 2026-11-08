package songrows

import "sync"

// Store keeps the rows, a revision that grows with each change, and the rows changed since the last
// drain. It is safe for many goroutines. The zero value is not ready: use NewStore.
type Store struct {
	mu       sync.Mutex
	rows     map[string]Row
	order    []string
	revision uint64
	drained  uint64
	dirty    map[string]struct{}
	removed  map[string]struct{}
}

// NewStore returns an empty store at revision 0.
func NewStore() *Store {
	return &Store{
		rows:    map[string]Row{},
		dirty:   map[string]struct{}{},
		removed: map[string]struct{}{},
	}
}

// Set adds the row or replaces the row with the same ID. A row equal to the one held is not a
// change: the revision stays and nothing is queued, so a writer may repeat itself for free.
func (s *Store) Set(row Row) {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, found := s.rows[row.ID]
	if found && old == row {
		return
	}
	if !found {
		s.order = append(s.order, row.ID)
	}
	s.rows[row.ID] = row
	delete(s.removed, row.ID)
	s.dirty[row.ID] = struct{}{}
	s.revision++
}

// Remove drops the row with the ID. An ID the store does not hold changes nothing.
func (s *Store) Remove(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, found := s.rows[id]; !found {
		return
	}
	delete(s.rows, id)
	delete(s.dirty, id)
	for i, held := range s.order {
		if held == id {
			s.order = append(s.order[:i], s.order[i+1:]...)
			break
		}
	}
	s.removed[id] = struct{}{}
	s.revision++
}

// State returns all the rows and the revision they are at, for a page that has just started or has
// missed a batch.
func (s *Store) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]Row, 0, len(s.order))
	for _, id := range s.order {
		rows = append(rows, s.rows[id])
	}
	return State{Revision: s.revision, Rows: rows}
}

// Drain returns the changes since the last drain and false when there are none. Each row appears
// once, with its newest value, however many times it changed.
func (s *Store) Drain() (Batch, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.revision == s.drained {
		return Batch{}, false
	}
	batch := Batch{From: s.drained, To: s.revision, Upserts: []Row{}, Removed: []string{}}
	for _, id := range s.order {
		if _, changed := s.dirty[id]; changed {
			batch.Upserts = append(batch.Upserts, s.rows[id])
		}
	}
	for id := range s.removed {
		batch.Removed = append(batch.Removed, id)
	}
	s.dirty = map[string]struct{}{}
	s.removed = map[string]struct{}{}
	s.drained = s.revision
	return batch, true
}
