package runhost

import (
	"context"
	"errors"
	"os"
	"time"

	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/playlistfile"
)

// autosaveEvery is how often the list file is written while the songs go. A list that has not
// changed is not written again.
const autosaveEvery = 3 * time.Second

// without returns urls with every copy of url left out.
func without(urls []string, url string) []string {
	kept := make([]string, 0, len(urls))
	for _, held := range urls {
		if held != url {
			kept = append(kept, held)
		}
	}

	return kept
}

// ListInfo is what the page is told about a list file that waits to be taken up again.
type ListInfo struct {
	Path    string `json:"path"`
	Sources int    `json:"sources"`
	Songs   int    `json:"songs"`
}

// keepList gives a list with no file of its own the recovery file, so a run that stops half way is
// taken up another day. It is called with mu not held.
func (s *Session) keepList() {
	s.mu.Lock()
	list, eng := s.list, s.eng
	s.mu.Unlock()
	if list == nil || list.Path() != "" || s.recovery == "" {
		return
	}
	if err := list.Save(s.recovery); err == nil && eng != nil {
		_ = list.SyncSnapshot(eng.Snapshot())
	}
}

// autosave writes the list from the engine every autosaveEvery, and once more when the engine's
// context ends. It stops when ctx ends.
func (s *Session) autosave(ctx context.Context, gen int, eng Engine) {
	tick := time.NewTicker(autosaveEvery)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			s.syncList(gen, eng)

			return
		case <-tick.C:
			s.syncList(gen, eng)
		}
	}
}

// syncList writes the list when it has a file and belongs to the engine of generation gen.
func (s *Session) syncList(gen int, eng Engine) {
	s.mu.Lock()
	list := s.list
	current := gen == s.gen
	s.mu.Unlock()
	if !current || list == nil || list.Path() == "" {
		return
	}
	_ = list.SyncSnapshot(eng.Snapshot())
}

// NewList empties the list and stops the engine, to begin a new one.
func (s *Session) NewList() {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.reset()
}

// OpenList replaces the list with the .mvd file at path. The songs of the file that are not
// downloaded show at once and wait for Start, in the order the file holds them, so the same file
// always shows the same list. It returns an error when the file cannot be read, and leaves the list
// as it was.
func (s *Session) OpenList(path string) error {
	list, err := downloadlist.Open(path)
	if err != nil {
		return err
	}
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.reset()

	return s.begin(list)
}

// SaveList saves the list in the file at path and keeps it up to date from then on. The recovery
// file is dropped once the list has a file of its own.
func (s *Session) SaveList(path string) error {
	s.cmd.Lock()
	defer s.cmd.Unlock()
	s.mu.Lock()
	list, eng := s.list, s.eng
	s.mu.Unlock()
	if list == nil {
		return errors.New("there is nothing to save yet")
	}
	previous := list.Path()
	if err := list.Save(path); err != nil {
		return err
	}
	if eng != nil {
		if err := list.SyncSnapshot(eng.Snapshot()); err != nil {
			return err
		}
	}
	if previous != "" && previous == s.recovery && previous != path {
		_ = os.Remove(previous)
	}

	return nil
}

// ListPath is the file of the list, "" while it has none or only the recovery file.
func (s *Session) ListPath() string {
	s.mu.Lock()
	list := s.list
	s.mu.Unlock()
	if list == nil || list.Path() == s.recovery {
		return ""
	}

	return list.Path()
}

// Recovery says what the recovery file holds, or false when there is nothing worth taking up.
func (s *Session) Recovery() (ListInfo, bool) {
	if s.recovery == "" {
		return ListInfo{}, false
	}
	file, err := playlistfile.Load(s.recovery)
	if err != nil || len(file.Items) == 0 {
		return ListInfo{}, false
	}

	return ListInfo{Path: s.recovery, Sources: len(file.Sources()), Songs: len(file.Songs())}, true
}

// DiscardRecovery deletes the recovery file.
func (s *Session) DiscardRecovery() {
	if s.recovery != "" {
		_ = os.Remove(s.recovery)
	}
}
