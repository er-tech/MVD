package songlist

import (
	"testing"

	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runstate"
)

func TestOnlyASongAWorkerHoldsIsNamingOrPicking(t *testing.T) {
	want := map[engine.EntryState]string{
		engine.StateQueued:    "waiting",
		engine.StateNamed:     "waiting",
		engine.StateResolving: "naming",
		engine.StatePicking:   "picking",
	}
	for state, word := range want {
		if got, _ := StatusWord(&runstate.Entry{State: state}); got != word {
			t.Fatalf("state %v shows %q, want %q", state, got, word)
		}
	}
}
