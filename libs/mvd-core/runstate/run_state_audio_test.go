package runstate

import (
	"testing"

	"youtube-downloader/libs/mvd-core/engine"
)

func TestAnEntryKnowsWhereItsBestAudioStepIsAndForgetsItWhenQueuedAgain(t *testing.T) {
	s := New([]engine.PlaylistSource{{Index: 0, URL: "https://a"}})
	s.Apply(engine.EvPlaylistListed{Playlist: 0, Title: "a", Entries: []engine.EntryInfo{{ID: 0, Playlist: 0, Index: 1, VideoID: "v", Title: "t"}}})
	s.Apply(engine.EvAudio{Entry: 0, Word: engine.AudioFetching})
	if got := s.Entries[0].Audio; got != engine.AudioFetching {
		t.Fatalf("audio %q, want %q", got, engine.AudioFetching)
	}
	s.Apply(engine.EvEntryState{Entry: 0, State: engine.StateQueued})
	if got := s.Entries[0].Audio; got != "" {
		t.Errorf("audio %q after a new queue, want none", got)
	}
}
