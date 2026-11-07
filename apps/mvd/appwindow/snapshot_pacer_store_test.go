package appwindow

import (
	"sync"
	"testing"
	"time"
)

type sentLog struct {
	mu   sync.Mutex
	list []string
}

func (s *sentLog) add(v string) { s.mu.Lock(); s.list = append(s.list, v); s.mu.Unlock() }
func (s *sentLog) all() []string {
	s.mu.Lock()
	defer s.mu.Unlock()

	return append([]string(nil), s.list...)
}

func TestAFloodOfSnapshotsSendsTheFirstAndThenOnlyTheLast(t *testing.T) {
	var log sentLog
	p := &snapshotPacer{every: 60 * time.Millisecond, send: log.add}
	for _, s := range []string{"a", "b", "c", "d", "e"} {
		p.offer(s)
	}
	time.Sleep(150 * time.Millisecond)

	got := log.all()
	if len(got) != 2 || got[0] != "a" || got[1] != "e" {
		t.Errorf("sent %v, want the first and the last: [a e]", got)
	}
}

func TestASnapshotTheSameAsTheSentOneIsNotSentAgain(t *testing.T) {
	var log sentLog
	p := &snapshotPacer{every: 20 * time.Millisecond, send: log.add}
	p.offer("a")
	p.offer("b")
	p.offer("a")
	time.Sleep(80 * time.Millisecond)
	p.offer("a")
	time.Sleep(40 * time.Millisecond)

	if got := log.all(); len(got) != 1 || got[0] != "a" {
		t.Errorf("sent %v, want only [a]", got)
	}
}

func TestASnapshotAfterAQuietTimeGoesAtOnce(t *testing.T) {
	var log sentLog
	p := &snapshotPacer{every: 20 * time.Millisecond, send: log.add}
	p.offer("a")
	time.Sleep(50 * time.Millisecond)
	p.offer("b")

	if got := log.all(); len(got) != 2 || got[1] != "b" {
		t.Errorf("sent %v, want b at once", got)
	}
}
