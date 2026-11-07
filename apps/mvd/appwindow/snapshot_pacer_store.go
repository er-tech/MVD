package appwindow

import (
	"sync"
	"time"
)

// snapshotPacer sends what the window shows to the page at most once in every interval. The page
// parses and draws each snapshot whole, and a run of thousands of songs changes it at every
// event, so without a pace the page does nothing else. The first snapshot after a quiet time goes
// at once; the ones that follow are held, and only the last of them is sent when the interval ends.
type snapshotPacer struct {
	every time.Duration
	send  func(snapshot string)

	mu     sync.Mutex
	latest string
	sent   string
	last   time.Time
	timer  *time.Timer
}

// offer gives the pacer the newest snapshot. It is sent now, or when the interval ends, unless it
// is the one the page already has.
func (p *snapshotPacer) offer(snapshot string) {
	p.mu.Lock()
	p.latest = snapshot
	if p.timer != nil || snapshot == p.sent {
		p.mu.Unlock()
		return
	}
	wait := p.every - time.Since(p.last)
	if wait > 0 {
		p.timer = time.AfterFunc(wait, p.flush)
		p.mu.Unlock()
		return
	}
	p.sent, p.last = snapshot, time.Now()
	p.mu.Unlock()
	p.send(snapshot)
}

// flush sends the newest snapshot when the interval ends, unless the page has it already.
func (p *snapshotPacer) flush() {
	p.mu.Lock()
	p.timer = nil
	snapshot := p.latest
	if snapshot == p.sent {
		p.mu.Unlock()
		return
	}
	p.sent, p.last = snapshot, time.Now()
	p.mu.Unlock()
	p.send(snapshot)
}

// resent records that the page was given this snapshot again outside the pace, so the next offer
// of the same one is not sent twice.
func (p *snapshotPacer) resent(snapshot string) {
	p.mu.Lock()
	p.sent, p.latest, p.last = snapshot, snapshot, time.Now()
	p.mu.Unlock()
}
