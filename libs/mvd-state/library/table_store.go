package library

// table is the rows of one kind, in the order they came in, with the IDs changed or removed since
// the last drain. It has no lock: the store that owns it holds one.
type table[T comparable] struct {
	rows       map[string]T
	order      []string
	dirty      map[string]struct{}
	dirtyOrder []string
	removed    map[string]struct{}
}

func newTable[T comparable]() *table[T] {
	return &table[T]{rows: map[string]T{}, dirty: map[string]struct{}{}, removed: map[string]struct{}{}}
}

// set adds the row or replaces the one with the ID, and says whether that changed anything.
func (t *table[T]) set(id string, row T) bool {
	old, found := t.rows[id]
	if found && old == row {
		return false
	}
	if !found {
		t.order = append(t.order, id)
	}
	t.rows[id] = row
	delete(t.removed, id)
	if _, queued := t.dirty[id]; !queued {
		t.dirty[id] = struct{}{}
		t.dirtyOrder = append(t.dirtyOrder, id)
	}

	return true
}

// remove drops the rows with the IDs in one pass and says whether any was held.
func (t *table[T]) remove(ids map[string]struct{}) bool {
	dropped := false
	for id := range ids {
		if _, found := t.rows[id]; found {
			delete(t.rows, id)
			delete(t.dirty, id)
			t.removed[id] = struct{}{}
			dropped = true
		}
	}
	if !dropped {
		return false
	}
	kept := t.order[:0]
	for _, id := range t.order {
		if _, gone := ids[id]; !gone {
			kept = append(kept, id)
		}
	}
	t.order = kept

	return true
}

// move puts the row with the ID at index to, clamped to the ends, and says whether its place changed.
func (t *table[T]) move(id string, to int) bool {
	from := -1
	for at, held := range t.order {
		if held == id {
			from = at
		}
	}
	to = max(0, min(to, len(t.order)-1))
	if from < 0 || from == to {
		return false
	}
	t.order = append(t.order[:from], t.order[from+1:]...)
	t.order = append(t.order[:to], append([]string{id}, t.order[to:]...)...)

	return true
}

// all returns the rows in order.
func (t *table[T]) all() []T {
	rows := make([]T, 0, len(t.order))
	for _, id := range t.order {
		rows = append(rows, t.rows[id])
	}

	return rows
}

// drain returns the changes since the last drain and forgets them. Each row appears once, with its
// newest value, in the order it was first changed.
func (t *table[T]) drain() Changes[T] {
	changes := Changes[T]{Upserts: []T{}, Removed: []string{}}
	for _, id := range t.dirtyOrder {
		if _, changed := t.dirty[id]; changed {
			changes.Upserts = append(changes.Upserts, t.rows[id])
		}
	}
	for id := range t.removed {
		changes.Removed = append(changes.Removed, id)
	}
	t.dirty = map[string]struct{}{}
	t.dirtyOrder = t.dirtyOrder[:0]
	t.removed = map[string]struct{}{}

	return changes
}
