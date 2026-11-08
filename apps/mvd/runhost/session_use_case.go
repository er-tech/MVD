package runhost

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runstate"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

// summaryEvery is how often the counts of the sources and of the run are worked out. Working them
// out for each event would cost a pass over every song each time.
const summaryEvery = 200 * time.Millisecond

// Session is the list the person is working on and the engine that fills it. It writes what the
// engine says into the library store, and it is the only writer: the page never changes the list
// by itself, it asks the session to.
//
// Nothing is downloaded until Start. Each link added is listed at once, its songs are named and the
// version of each is picked, and the song waits for Start. After Start, each song that is ready goes
// to the downloads at once, while the loading goes on.
//
// Two locks keep it from stopping. The engine's event channel blocks a call that sends to it while
// it is full, and the pump is the one that empties it. So the pump only ever takes mu, and no code
// calls the engine while it holds mu: the commands call the engine under cmd, which the pump never
// takes.
type Session struct {
	store *library.Store
	build Build
	cfg   func() config.Config
	ctx   context.Context

	// cmd serialises the commands, which may call the engine.
	cmd sync.Mutex

	// mu guards what follows. It is never held across a call to the engine.
	mu      sync.Mutex
	eng     Engine
	cancel  context.CancelFunc
	gen     int
	list    *downloadlist.Session
	state   *runstate.State
	known   map[string]struct{}
	started bool
	paused  bool
	dirty   map[int]struct{}
	ended   chan struct{}

	// release is the songs that are ready after Start and wait for a call to the engine.
	release   releaseQueue
	releasing chan struct{}

	// onFailure is told each time a song fails; guarded by mu.
	onFailure func()

	// recovery is where a list with no file of its own is kept while it runs, "" for nowhere.
	recovery string
}

// New returns a session with no engine. The engine is built when the first link is added, with the
// settings cfg gives at that moment.
//
// ctx ends the session: when it ends, the engine is stopped and its programs are ended. recovery is
// the file that keeps a list with no file of its own, "" for none.
func New(ctx context.Context, store *library.Store, build Build, cfg func() config.Config, recovery string) *Session {
	return &Session{
		store: store, build: build, cfg: cfg, ctx: ctx, recovery: recovery,
		known:     map[string]struct{}{},
		dirty:     map[int]struct{}{},
		releasing: make(chan struct{}, 1),
	}
}

// ErrAlreadyListed is returned by AddSource for a link already in the list.
var ErrAlreadyListed = errors.New("that link is already in the list")

// AddSource puts a link in the list and starts to list its songs at once.
//
// url is the address of a playlist, an album or a song. It returns ErrAlreadyListed for a link that
// is in the list, an error for an empty one, and the error of the engine when it cannot be built.
func (s *Session) AddSource(url string) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return errors.New("write or paste a link")
	}
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.mu.Lock()
	_, listed := s.known[url]
	eng := s.eng
	s.mu.Unlock()
	if listed {
		return ErrAlreadyListed
	}
	if eng == nil {
		return s.begin(downloadlist.New([]string{url}))
	}
	if _, accepted := eng.AddSource(url); !accepted {
		return errors.New("the run has ended: restart the app to add more links")
	}
	s.mu.Lock()
	s.known[url] = struct{}{}
	list := s.list
	s.mu.Unlock()
	list.SetSources(append(list.Sources(), url))

	return nil
}

// begin builds the engine with the sources and plan of the list and starts it.
func (s *Session) begin(list *downloadlist.Session) error {
	sources, plan := list.Inputs()
	ctx, cancel := context.WithCancel(s.ctx)
	eng, err := s.build(ctx, s.cfg(), sources, plan)
	if err != nil {
		cancel()

		return describe("cannot start the engine", err)
	}
	s.mu.Lock()
	s.gen++
	gen := s.gen
	s.eng, s.cancel, s.list = eng, cancel, list
	s.state = runstate.New(eng.Sources())
	s.ended = make(chan struct{})
	for _, url := range list.Sources() {
		s.known[url] = struct{}{}
	}
	for _, pl := range s.state.Playlists {
		s.store.SetSource(sourceRow(s.state, pl))
	}
	s.store.SetRun(runOf(s.state, s.started, s.paused))
	ended := s.ended
	s.mu.Unlock()
	// The session has ended when the events are folded and the list is written for the last time.
	var work sync.WaitGroup
	work.Add(2)
	go func() {
		work.Wait()
		close(ended)
	}()
	go func() {
		defer work.Done()
		s.pump(gen, eng)
	}()
	go func() {
		defer work.Done()
		s.autosave(ctx, gen, eng)
	}()
	go s.releaser(ctx, eng)
	go eng.Run(ctx)

	return nil
}

// reset stops the engine, waits a moment for it to end and empties the list, ready for a new one.
func (s *Session) reset() {
	s.mu.Lock()
	cancel, ended := s.cancel, s.ended
	s.gen++
	s.eng, s.cancel, s.list, s.state, s.ended = nil, nil, nil, nil, nil
	s.known = map[string]struct{}{}
	s.dirty = map[int]struct{}{}
	s.started, s.paused = false, false
	s.mu.Unlock()
	s.release.take()
	if cancel != nil {
		cancel()
		select {
		case <-ended:
		case <-time.After(2 * time.Second):
		}
	}
	s.store.Clear()
	s.store.SetRun(library.Run{Phase: "empty"})
}

// RemoveSource takes a source and all its songs out of the list. An ID that names nothing is an
// error.
func (s *Session) RemoveSource(id string) error {
	index, valid := parseID(sourcePrefix, id)
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.mu.Lock()
	eng := s.eng
	var url string
	found := false
	if valid && eng != nil {
		if at := s.state.PlaylistPos(index); at >= 0 {
			url, found = s.state.Playlists[at].URL, true
		}
	}
	list := s.list
	if found {
		delete(s.known, url)
	}
	s.mu.Unlock()
	if found {
		list.SetSources(without(list.Sources(), url))
	}
	if !found {
		return errors.New("that source is not in the list")
	}
	eng.RemoveSource(index)

	return nil
}

// Start sends every song that is ready to the downloads, and each one that becomes ready later,
// while the loading goes on. It returns at once. It returns an error when no link was added.
func (s *Session) Start() error {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.mu.Lock()
	eng := s.eng
	if eng != nil {
		s.started, s.paused = true, false
		s.store.SetRun(runOf(s.state, s.started, s.paused))
	}
	s.mu.Unlock()
	if eng == nil {
		return errors.New("add a playlist or a song first")
	}
	s.keepList()
	eng.Resume()
	s.release.all()
	s.wakeReleaser()

	return nil
}

// Pause holds the downloads that have not begun. The ones going on finish.
func (s *Session) Pause() {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	if eng := s.markPaused(true); eng != nil {
		eng.Pause()
	}
}

// Resume lets the held downloads go on.
func (s *Session) Resume() {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	if eng := s.markPaused(false); eng != nil {
		eng.Resume()
	}
}

// markPaused records the choice and returns the engine to tell, nil before Start.
func (s *Session) markPaused(paused bool) Engine {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.eng == nil || !s.started {
		return nil
	}
	s.paused = paused
	s.store.SetRun(runOf(s.state, s.started, s.paused))

	return s.eng
}

// RetryFailed queues the failed songs again and says how many.
func (s *Session) RetryFailed() int {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.mu.Lock()
	eng := s.eng
	s.mu.Unlock()
	if eng == nil {
		return 0
	}

	return eng.RetryAll()
}

// Detail says all about a source or a song. kind is "source" or "song".
func (s *Session) Detail(kind, id string) (Detail, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.eng != nil {
		switch kind {
		case "source":
			if index, valid := parseID(sourcePrefix, id); valid {
				if at := s.state.PlaylistPos(index); at >= 0 {
					return sourceDetail(s.state, s.state.Playlists[at]), nil
				}
			}
		case "song":
			if entry, valid := parseID(songPrefix, id); valid {
				if en := s.state.Entry(entry); en != nil {
					return songDetail(s.state, en), nil
				}
			}
		}
	}

	return Detail{}, errors.New("that item is not in the list")
}

// Wait returns when the engine has stopped, or after timeout, and says whether it stopped. It
// returns true at once for a session with no engine. Call it after the context has ended.
func (s *Session) Wait(timeout time.Duration) bool {
	s.mu.Lock()
	ended := s.ended
	s.mu.Unlock()
	if ended == nil {
		return true
	}
	select {
	case <-ended:
		return true
	case <-time.After(timeout):
		return false
	}
}

// pump folds each event of the engine into the run state and the store, and every summaryEvery
// works out the counts of the sources and of the run. It ends when the engine closes its events.
func (s *Session) pump(gen int, eng Engine) {
	tick := time.NewTicker(summaryEvery)
	defer tick.Stop()
	events := eng.Events()
	for {
		select {
		case ev, open := <-events:
			if !open {
				s.summarise(gen)

				return
			}
			if s.fold(gen, ev) {
				s.mu.Lock()
				report := s.onFailure
				s.mu.Unlock()
				if report != nil {
					report()
				}
			}
		case <-tick.C:
			s.summarise(gen)
		}
	}
}

// fold applies one event of the engine of generation gen. An event of an engine that a reset has
// replaced is dropped.
func (s *Session) fold(gen int, ev interface{}) (failed bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if gen != s.gen {
		return false
	}
	switch e := ev.(type) {
	case engine.EvPlaylistRemoved:
		s.state.Apply(ev)
		s.store.RemoveSource(sourceID(e.Playlist))
		delete(s.dirty, e.Playlist)
	case engine.EvPlaylistListed:
		s.state.Apply(ev)
		if at := s.state.PlaylistPos(e.Playlist); at >= 0 {
			for _, id := range s.state.Playlists[at].Entries {
				s.store.SetSong(songRow(s.state.Entries[id]))
			}
		}
		s.dirty[e.Playlist] = struct{}{}
	case engine.EvPlaylistAdded:
		s.state.Apply(ev)
		s.dirty[e.Source.Index] = struct{}{}
	case engine.EvPlaylistFailed:
		s.state.Apply(ev)
		s.dirty[e.Playlist] = struct{}{}
	default:
		entry := s.state.Apply(ev)
		en := s.state.Entry(entry)
		if en == nil {
			return false
		}
		if _, isLog := ev.(engine.EvLog); isLog {
			return false
		}
		s.store.SetSong(songRow(en))
		s.dirty[en.Playlist] = struct{}{}
		if change, isState := ev.(engine.EvEntryState); isState {
			if s.started && change.State == engine.StatePlanned {
				s.release.add(entry)
				s.wakeReleaser()
			}

			return change.State == engine.StateFailed
		}
	}

	return false
}

// OnFailure sets the function called each time a song fails, on the goroutine that folds the
// events, so it must return quickly. The app uses it to look for a newer downloader.
func (s *Session) OnFailure(report func()) {
	s.mu.Lock()
	s.onFailure = report
	s.mu.Unlock()
}

// summarise writes the sources that changed and the run to the store.
func (s *Session) summarise(gen int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if gen != s.gen {
		return
	}
	for index := range s.dirty {
		if at := s.state.PlaylistPos(index); at >= 0 {
			s.store.SetSource(sourceRow(s.state, s.state.Playlists[at]))
		}
		delete(s.dirty, index)
	}
	s.store.SetRun(runOf(s.state, s.started, s.paused))
}
