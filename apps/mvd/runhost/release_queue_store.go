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
	// chosen is the video the person picked for a song that is still held.
	chosen map[int]string
}

// choose keeps the video the person picked for a held song, to give it when the song is released.
func (q *releaseQueue) choose(entry int, video string) {
	q.mu.Lock()
	if q.chosen == nil {
		q.chosen = map[int]string{}
	}
	q.chosen[entry] = video
	q.mu.Unlock()
}

// videoFor returns the video picked for a song, "" for none, and forgets it.
func (q *releaseQueue) videoFor(entry int) string {
	q.mu.Lock()
	defer q.mu.Unlock()
	video := q.chosen[entry]
	delete(q.chosen, entry)

	return video
}

// chosenAll returns every pick not given yet and forgets them.
func (q *releaseQueue) chosenAll() map[int]string {
	q.mu.Lock()
	defer q.mu.Unlock()
	picks := q.chosen
	q.chosen = nil

	return picks
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
			for entry, video := range s.release.chosenAll() {
				eng.Release(entry, video)
			}
			eng.ReleaseAll()
		}
		for _, entry := range entries {
			eng.Release(entry, s.release.videoFor(entry))
		}
	}
}
