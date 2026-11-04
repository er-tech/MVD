package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/run/downloadsession"
)

type (
	// evMsg and evClosed say which run's events they came from, so what a run that was let go
	// still says is not taken for what the run now shown says. more are the events that were
	// already waiting when ev arrived, in order: a burst is one message.
	evMsg struct {
		ev   interface{}
		more []interface{}
		from <-chan interface{}
	}
	evClosed struct{ from <-chan interface{} }
)

// maxBurst is the most events taken in one message, so a flood cannot hold the window back for long.
const maxBurst = 256

// waitEvent waits for the next event of the run and takes with it the ones that are already waiting.
func waitEvent(ch <-chan interface{}) program.Cmd {
	return func() program.Msg {
		ev, ok := <-ch
		if !ok {
			return evClosed{from: ch}
		}
		msg := evMsg{ev: ev, from: ch}
		for len(msg.more) < maxBurst {
			select {
			case next, open := <-ch:
				if !open {
					return msg // the next wait finds the channel closed
				}
				msg.more = append(msg.more, next)
			default:
				return msg
			}
		}
		return msg
	}
}

// runEvents takes what the run reported into the session, and waits for the next event.
func (m Model) runEvents(msg evMsg) (program.Model, program.Cmd) {
	if msg.from != nil && msg.from != m.events {
		return m, nil // a run that has been let go: its events are not the ones shown
	}
	for _, ev := range append([]interface{}{msg.ev}, msg.more...) {
		m.dl.Apply(ev)
	}

	return m, waitEvent(m.events)
}

// runEventsEnded handles the end of a run's events: what the session asks of the host is done.
func (m Model) runEventsEnded(msg evClosed) Model {
	if msg.from != nil && msg.from != m.events {
		return m
	}
	eff := m.dl.RunClosed()
	if _, ended := eff.(downloadsession.RunEnded); ended {
		m.events = nil
	}
	if open, ok := eff.(downloadsession.OpenURL); ok {
		m.openVideo(open.URL)
	}

	return m
}

// openVideo shows a video in the person's browser.
func (m *Model) openVideo(address string) {
	if m.host.Open == nil {
		return
	}
	if err := m.host.Open(address); err != nil {
		m.notice = "Cannot open the browser: " + err.Error()
	}
}
