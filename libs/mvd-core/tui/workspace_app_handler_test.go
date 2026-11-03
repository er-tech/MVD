package tui

import (
	"path/filepath"
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/prefspopup"
	"youtube-downloader/libs/mvd-core/program"
	"youtube-downloader/libs/mvd-core/workspace"
)

func TestPreferencesApplyAtOnceExceptWhereFilesGo(t *testing.T) {
	cfg := config.Config{OutputDir: "/music", MaxConcurrentDownloads: 2}
	var live engine.LiveSettings
	a := NewWorkspaceApp(WorkspaceInput{
		Setup: SetupInput{Cfg: cfg, CfgPath: filepath.Join(t.TempDir(), "config.conf")},
		Live: func(c config.Config) engine.LiveSettings {
			live = engine.LiveSettings{Workers: c.MaxConcurrentDownloads}
			return live
		},
	}).(workspaceApp)

	changed := cfg
	changed.MaxConcurrentDownloads = 5
	changed.OutputDir = "/elsewhere"
	a = a.apply(changed, false)
	if a.cfg.MaxConcurrentDownloads != 5 || live.Workers != 5 {
		t.Errorf("the number of downloads was not applied: %d, %d", a.cfg.MaxConcurrentDownloads, live.Workers)
	}
	if a.cfg.OutputDir != "/music" {
		t.Errorf("the folder changed before it was confirmed: %q", a.cfg.OutputDir)
	}
	a = a.apply(changed, true)
	if a.cfg.OutputDir != "/elsewhere" {
		t.Errorf("the folder was not applied once confirmed: %q", a.cfg.OutputDir)
	}
}

func openedPreferences(t *testing.T) workspaceApp {
	t.Helper()
	a := NewWorkspaceApp(WorkspaceInput{
		Setup: SetupInput{Cfg: config.Config{OutputDir: "/music", MaxConcurrentDownloads: 2}, CfgPath: filepath.Join(t.TempDir(), "config.conf")},
	}).(workspaceApp)
	next, _ := a.Update(program.WindowSizeMsg{Width: 120, Height: 40})
	next, _ = next.Update(workspace.PreferencesRequestedMsg{})
	a = next.(workspaceApp)
	if !a.inPrefs {
		t.Fatal("the preferences did not open")
	}

	return a
}

// said is what the status line of the window says.
func said(m program.Model) string { return m.(workspaceApp).ws.Window().Status.Summary }

func TestCloseAndSaveLeaveThePreferencesAndSaveKeepsTheFolders(t *testing.T) {
	a := openedPreferences(t)
	next, _ := a.Update(prefspopup.CloseMsg{})
	if next.(workspaceApp).inPrefs {
		t.Error("close did not close the preferences")
	}

	a = openedPreferences(t)
	a.prefs = a.prefs.WithConfig(config.Config{OutputDir: "/elsewhere", MaxConcurrentDownloads: 2})
	next, _ = a.Update(prefspopup.SaveMsg{})
	if got := next.(workspaceApp).cfg.OutputDir; got != "/elsewhere" {
		t.Errorf("save left the folder at %q", got)
	}
	if next.(workspaceApp).inPrefs {
		t.Error("save did not close the preferences")
	}
}

func TestTheWorkspaceBehindThePreferencesOfTheFirstStartIsReady(t *testing.T) {
	a := NewWorkspaceApp(WorkspaceInput{
		Setup: SetupInput{Cfg: config.Config{OutputDir: "/music"}, CfgPath: filepath.Join(t.TempDir(), "config.conf"), OpenConfig: true},
	})
	next, _ := a.Update(program.WindowSizeMsg{Width: 120, Height: 40})
	app := next.(workspaceApp)
	if !app.inPrefs {
		t.Fatal("the first start did not open the preferences")
	}
	if toolbar := app.ws.Window().Toolbar; len(toolbar) == 0 || !strings.Contains(toolbar[len(toolbar)-1].Label, "Add source") {
		t.Errorf("the workspace behind the preferences has the toolbar %+v", toolbar)
	}
}

func TestSavingPreferencesSaysSo(t *testing.T) {
	a := openedPreferences(t)
	a.prefs = a.prefs.WithConfig(config.Config{OutputDir: "/elsewhere", MaxConcurrentDownloads: 2})
	next, _ := a.Update(prefspopup.SaveMsg{})
	if got := said(next); !strings.Contains(got, "Preferences saved") {
		t.Errorf("saving says %q", got)
	}
}

func TestLeavingPreferencesWithAChangedFolderWarnsThatItWasNotKept(t *testing.T) {
	a := openedPreferences(t)
	a.prefs = a.prefs.WithConfig(config.Config{OutputDir: "/elsewhere", MaxConcurrentDownloads: 2})
	next, _ := a.Update(prefspopup.CloseMsg{})
	if got := said(next); !strings.Contains(got, "were not kept") {
		t.Errorf("a dropped folder change says %q", got)
	}
}

func TestLeavingPreferencesWithNothingChangedSaysNothing(t *testing.T) {
	a := openedPreferences(t)
	next, _ := a.Update(prefspopup.CloseMsg{})
	if got := said(next); strings.Contains(got, "were not kept") || strings.Contains(got, "Preferences saved") {
		t.Errorf("closing untouched preferences said %q", got)
	}
}
