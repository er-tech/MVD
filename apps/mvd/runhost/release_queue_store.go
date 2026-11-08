package runhost

import (
	"context"
	"sync"
)

// releaseQueue is the songs waiting for a call to Engine.Release, and whether all the held songs
// are to be released. It has its own lock, so the pump can add to it while it holds the session's.
type releaseQueue struct {
	mu      sync.Mutex
	entries []int
	every   bool
}

// add queues one song.
func (q *releaseQueue) add(entry int) {
	q.mu.Lock()
	q.entries = append(q.entries, entry)
	q.mu.Unlock()
}

// all asks for every held song to be released.
func (q *releaseQueue) all() {
	q.mu.Lock()
	q.every = true
	q.mu.Unlock()
}

// take returns what is queued and empties the queue.
func (q *releaseQueue) take() (every bool, entries []int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	every, entries = q.every, q.entries
	q.every, q.entries = false, nil

	return every, entries
}

// wakeReleaser tells the releaser there is work. A wake already waiting is enough.
func (s *Session) wakeReleaser() {
	select {
	case s.releasing <- struct{}{}:
	default:
	}
}

// releaser calls the engine for the queued songs, on a goroutine of its own: Release sends events
// and the pump, which empties them, must never be the one that waits for it. It ends with the
// engine's context.
func (s *Session) releaser(ctx context.Context, eng Engine) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.releasing:
		}
		every, entries := s.release.take()
		if every {
			eng.ReleaseAll()
		}
		for _, entry := range entries {
			eng.Release(entry, "")
		}
	}
}
