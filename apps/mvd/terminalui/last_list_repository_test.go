package terminalui

import (
	"path/filepath"
	"testing"
)

func TestTheLastListIsKeptForTheNextStart(t *testing.T) {
	file := filepath.Join(t.TempDir(), "last-list.txt")
	if _, known := loadKeptPath(file); known {
		t.Fatal("a list was known before any was kept")
	}
	for _, want := range []string{filepath.Join("lists", "Untitled list.mvd"), ""} {
		if err := saveKeptPath(file, want); err != nil {
			t.Fatal(err)
		}
		if got, known := loadKeptPath(file); !known || got != want {
			t.Errorf("loaded %q (known %v), want %q", got, known, want)
		}
	}
}
