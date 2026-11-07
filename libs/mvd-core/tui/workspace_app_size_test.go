package tui

import (
	"path/filepath"
	"testing"
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/workspace"
)

// The first message of a program is its size. Loading the list can begin with it, and the command
// that begins it must reach the program, or the workspace waits for a start that never comes.
func TestTheSizeMessageThatBeginsLoadingTheListKeepsItsCommand(t *testing.T) {
	started := make(chan struct{}, 1)
	a := NewWorkspaceApp(WorkspaceInput{
		Setup: SetupInput{Cfg: config.Config{OutputDir: t.TempDir()}, CfgPath: filepath.Join(t.TempDir(), "config.conf")},
		List:  downloadlist.New([]string{"https://www.youtube.com/playlist?list=a"}),
		Host: workspace.Host{
			AutoLoad:     true,
			RecoveryFile: filepath.Join(t.TempDir(), "unsaved-list.tmp"),
			Start: func(config.Config, []string, []engine.PlannedEntry, bool) (workspace.ListRun, error) {
				started <- struct{}{}

				return nil, nil
			},
		},
	})

	_, cmd := a.Update(program.WindowSizeMsg{Width: 120, Height: 40})
	if cmd == nil {
		t.Fatal("the size message dropped the command that starts loading")
	}
	run(cmd)
	select {
	case <-started:
	default:
		t.Error("the command did not start the run")
	}
}

// run does what cmd asks, and what the commands of a batch ask.
func run(cmd program.Cmd) {
	if cmd == nil {
		return
	}
	if batch, ok := cmd().(program.BatchMsg); ok {
		for _, each := range batch {
			run(each)
		}
	}
}
