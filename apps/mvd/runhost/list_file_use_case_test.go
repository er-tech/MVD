package runhost

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/playlistfile"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

// listSession is a session whose engine builder records what it was given.
func listSession(t *testing.T, recovery string) (*Session, *library.Store, *[][]string) {
	t.Helper()
	store := library.NewStore()
	var built [][]string
	ctx, cancel := context.WithCancel(context.Background())
	build := func(_ context.Context, _ config.Config, sources []string, _ []engine.PlannedEntry) (Engine, error) {
		built = append(built, sources)
		fake := newFakeEngine()
		for i, url := range sources {
			fake.sources = append(fake.sources, engine.PlaylistSource{Index: i, URL: url})
		}

		return fake, nil
	}

	session := New(ctx, store, build, func() config.Config { return config.Config{} }, recovery)
	// The last write of the list must end before the folder of the test is removed.
	t.Cleanup(func() {
		cancel()
		session.Wait(2 * time.Second)
	})

	return session, store, &built
}

func writeList(t *testing.T, path string, sources ...string) {
	t.Helper()
	var items []playlistfile.Item
	for _, source := range sources {
		items = append(items, playlistfile.Item{Source: source})
	}
	if err := playlistfile.Save(path, playlistfile.File{Items: items}); err != nil {
		t.Fatal(err)
	}
}

func TestOpeningAFileShowsItsSourcesAtOnceAndTheSameEveryTime(t *testing.T) {
	path := filepath.Join(t.TempDir(), "list.mvd")
	writeList(t, path, "https://example.com/a", "https://example.com/b")
	var first []library.Source
	for i := 0; i < 10; i++ {
		session, store, _ := listSession(t, "")
		if err := session.OpenList(path); err != nil {
			t.Fatal(err)
		}
		state := store.State()
		if i == 0 {
			first = state.Sources
		}
		if len(state.Sources) != 2 || state.Sources[0] != first[0] || state.Sources[1] != first[1] {
			t.Fatalf("load %d showed %+v, the first showed %+v", i, state.Sources, first)
		}
	}
	if first[0].URL != "https://example.com/a" || first[1].URL != "https://example.com/b" {
		t.Fatalf("sources %+v, want a then b", first)
	}
}

func TestOpeningAFileThatCannotBeReadLeavesTheListAsItWas(t *testing.T) {
	session, store, _ := listSession(t, "")
	_ = session.AddSource("https://example.com/list")
	if err := session.OpenList(filepath.Join(t.TempDir(), "missing.mvd")); err == nil {
		t.Fatal("a missing file was opened")
	}
	if len(store.State().Sources) != 1 {
		t.Fatalf("state %+v, want the list as it was", store.State())
	}
}

func TestOpeningAFileReplacesTheListAndDropsTheOldRows(t *testing.T) {
	path := filepath.Join(t.TempDir(), "list.mvd")
	writeList(t, path, "https://example.com/new")
	session, store, _ := listSession(t, "")
	_ = session.AddSource("https://example.com/old")
	if err := session.OpenList(path); err != nil {
		t.Fatal(err)
	}
	state := store.State()
	if len(state.Sources) != 1 || state.Sources[0].URL != "https://example.com/new" {
		t.Fatalf("state %+v, want only the new source", state)
	}
	if err := session.AddSource("https://example.com/old"); err != nil {
		t.Fatalf("a link of the old list could not be added again: %v", err)
	}
}

func TestANewListIsEmpty(t *testing.T) {
	session, store, _ := listSession(t, "")
	_ = session.AddSource("https://example.com/list")
	session.NewList()
	state := store.State()
	if len(state.Sources) != 0 || state.Run.Phase != "empty" {
		t.Fatalf("state %+v, want empty", state)
	}
	if err := session.Start(); err == nil {
		t.Fatal("Start on an empty list was accepted")
	}
}

func TestSavingWritesAFileThatOpensAgainWithTheSameSources(t *testing.T) {
	path := filepath.Join(t.TempDir(), "mine.mvd")
	session, _, _ := listSession(t, "")
	_ = session.AddSource("https://example.com/a")
	_ = session.AddSource("https://example.com/b")
	if err := session.SaveList(path); err != nil {
		t.Fatal(err)
	}
	if session.ListPath() != path {
		t.Fatalf("list path %q, want %q", session.ListPath(), path)
	}
	file, err := playlistfile.Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := file.Sources(); len(got) != 2 || got[0] != "https://example.com/a" || got[1] != "https://example.com/b" {
		t.Fatalf("sources %v, want a and b", got)
	}
}

func TestSavingWithNothingInTheListIsAnError(t *testing.T) {
	session, _, _ := listSession(t, "")
	if err := session.SaveList(filepath.Join(t.TempDir(), "x.mvd")); err == nil {
		t.Fatal("an empty list was saved")
	}
}

func TestStartKeepsTheListInTheRecoveryFileAndSavingAsDropsIt(t *testing.T) {
	dir := t.TempDir()
	recovery := filepath.Join(dir, "recovery.mvd")
	session, _, _ := listSession(t, recovery)
	_ = session.AddSource("https://example.com/list")
	if _, found := session.Recovery(); found {
		t.Fatal("a recovery was offered before Start")
	}
	if err := session.Start(); err != nil {
		t.Fatal(err)
	}
	info, found := session.Recovery()
	if !found || info.Path != recovery || info.Sources != 1 {
		t.Fatalf("recovery %+v found %v, want one source in %s", info, found, recovery)
	}
	if session.ListPath() != "" {
		t.Fatalf("list path %q, want none for a recovery file", session.ListPath())
	}
	own := filepath.Join(dir, "own.mvd")
	if err := session.SaveList(own); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(recovery); !os.IsNotExist(err) {
		t.Fatalf("the recovery file is still there: %v", err)
	}
}

func TestADiscardedRecoveryIsNotOfferedAgain(t *testing.T) {
	recovery := filepath.Join(t.TempDir(), "recovery.mvd")
	writeList(t, recovery, "https://example.com/list")
	session, _, _ := listSession(t, recovery)
	if _, found := session.Recovery(); !found {
		t.Fatal("the recovery file was not offered")
	}
	session.DiscardRecovery()
	if _, found := session.Recovery(); found {
		t.Fatal("a discarded recovery was offered")
	}
}
