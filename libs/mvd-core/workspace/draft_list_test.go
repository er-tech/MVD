package workspace

import (
	"os"
	"path/filepath"
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/playlistfile"
)

func newListHost(t *testing.T, fake *fakeRun) (Host, string) {
	t.Helper()
	recovery := filepath.Join(t.TempDir(), "app", "unsaved-list.tmp")

	return Host{RecoveryFile: recovery, Start: func(config.Config, []string, []engine.PlannedEntry, bool) (ListRun, error) { return fake, nil }}, recovery
}

func TestStartingANewListKeepsItInTheRecoveryFileAndStartsAtOnce(t *testing.T) {
	host, recovery := newListHost(t, newFakeRun())
	m := sized(New(host, config.Config{OutputDir: t.TempDir()}, downloadlist.New([]string{"https://youtu.be/x"})))
	m, cmd := choose(m, entryStart)
	if cmd == nil || !m.life.Starting {
		t.Fatalf("the run did not begin to start: asking %v, starting %v", m.asking, m.life.Starting)
	}
	if m.asking != askNone {
		t.Errorf("a question was asked before starting: %v", m.asking)
	}
	if _, err := os.Stat(recovery); err != nil {
		t.Errorf("no recovery file was written: %v", err)
	}
	if filepath.Ext(recovery) == playlistfile.Extension {
		t.Errorf("the recovery file %q has the extension of a list", recovery)
	}
}

func TestSavingTheListDeletesTheRecoveryFile(t *testing.T) {
	host, recovery := newListHost(t, newFakeRun())
	m := sized(New(host, config.Config{OutputDir: t.TempDir()}, downloadlist.New([]string{"https://youtu.be/x"})))
	m, _ = choose(m, entryStart)
	m.save(filepath.Join(t.TempDir(), "mine.mvd"))
	if _, err := os.Stat(recovery); !os.IsNotExist(err) {
		t.Errorf("the recovery file is still there after the save: %v", err)
	}
}

func TestStartingANewListDeletesTheRecoveryFile(t *testing.T) {
	host, recovery := newListHost(t, newFakeRun())
	if err := os.MkdirAll(filepath.Dir(recovery), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := downloadlist.New([]string{"https://youtu.be/x"}).Save(recovery); err != nil {
		t.Fatal(err)
	}
	recovered, err := downloadlist.Open(recovery) // as the next start brings it back
	if err != nil {
		t.Fatal(err)
	}
	m, _ := choose(sized(New(host, config.Config{OutputDir: t.TempDir()}, recovered)), entryNew)
	if _, err := os.Stat(recovery); !os.IsNotExist(err) {
		t.Errorf("the recovery file is still there after a new list: %v", err)
	}
	if m.session.Path() != "" {
		t.Errorf("the new list has the file %q", m.session.Path())
	}
}

func TestSaveOfAListInTheRecoveryFileAsksWhereToSave(t *testing.T) {
	host, recovery := newListHost(t, newFakeRun())
	host.SaveFile = func(dir, name string) (string, bool, error) { return "", false, nil }
	if err := os.MkdirAll(filepath.Dir(recovery), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := downloadlist.New([]string{"https://youtu.be/x"}).Save(recovery); err != nil {
		t.Fatal(err)
	}
	recovered, err := downloadlist.Open(recovery) // as the next start brings it back
	if err != nil {
		t.Fatal(err)
	}
	m := sized(New(host, config.Config{OutputDir: t.TempDir()}, recovered))
	if _, cmd := choose(m, entrySave); cmd == nil {
		t.Error("Save wrote into the recovery file instead of asking where to save")
	}
}

func TestWithoutAFolderOfListsTheListIsAskedToBeSavedAsBefore(t *testing.T) {
	m := sized(New(Host{Start: func(config.Config, []string, []engine.PlannedEntry, bool) (ListRun, error) { return newFakeRun(), nil }}, config.Config{OutputDir: t.TempDir()}, downloadlist.New([]string{"https://youtu.be/x"})))
	m, _ = choose(m, entryStart)
	if m.asking != askSaveThenReview {
		t.Errorf("asking %v, want the question where to save", m.asking)
	}
}
