package terminalui

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/prefsform"
	"youtube-downloader/libs/mvd-core/sourcelist"
	"youtube-downloader/libs/mvd-core/tui"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// noRun is a starter for tests that never start a run.
func noRun(config.Config, []string) (tui.Run, error) { return nil, errors.New("no run in this test") }

func testFiles(t *testing.T, urls ...string) (string, Files) {
	t.Helper()
	dir := t.TempDir()
	files := Files{Config: filepath.Join(dir, "config.conf"), List: filepath.Join(dir, "list.txt")}
	if err := config.Save(config.Default(dir, dir), files.Config); err != nil {
		t.Fatal(err)
	}
	if err := sourcelist.Save(files.List, urls); err != nil {
		t.Fatal(err)
	}
	return dir, files
}

// started runs the app with no terminal and returns what it tells the host: the windows it shows and
// the preferences it opens.
func started(t *testing.T, dir string, files Files) (<-chan windowsnapshot.Snapshot, <-chan *prefsform.Window) {
	t.Helper()
	windows := make(chan windowsnapshot.Snapshot, 64)
	prefs := make(chan *prefsform.Window, 64)
	host := Host{
		Start:       noRun,
		Style:       func(string, string) {},
		Window:      func(s windowsnapshot.Snapshot) { windows <- s },
		Preferences: func(w *prefsform.Window) { prefs <- w },
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	Start(ctx, NewModelFactory(dir, files, host, t.Logf)())

	return windows, prefs
}

func TestTheAppStartsOnTheSavedListWithNoTerminal(t *testing.T) {
	dir, files := testFiles(t, "https://a", "https://b")
	windows, _ := started(t, dir, files)

	select {
	case snap := <-windows:
		if snap.Sources.Heading != "2 sources" {
			t.Errorf("sources: %q", snap.Sources.Heading)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the app showed no window")
	}
}

func TestTheAppOpensThePreferencesOnTheFirstRun(t *testing.T) {
	dir := t.TempDir()
	files := Files{Config: filepath.Join(dir, "config.conf"), List: filepath.Join(dir, "list.txt")}
	_, prefs := started(t, dir, files)

	select {
	case w := <-prefs:
		if w == nil || w.Title != "Preferences" {
			t.Errorf("the first run should open the preferences, got %+v", w)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the preferences never opened")
	}
}
