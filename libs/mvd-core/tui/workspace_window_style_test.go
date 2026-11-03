package tui

import (
	"path/filepath"
	"testing"

	tea "charm.land/bubbletea/v2"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/workspace"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// styledApp is the workspace app of a host that draws the classic styles, with what it was told.
func styledApp(t *testing.T, style string) (workspaceApp, *[]string, *[]windowsnapshot.Snapshot) {
	t.Helper()
	styles, windows := &[]string{}, &[]windowsnapshot.Snapshot{}
	a := NewWorkspaceApp(WorkspaceInput{
		Setup:  SetupInput{Cfg: config.Config{OutputDir: "/music", WindowStyle: style}, CfgPath: filepath.Join(t.TempDir(), "config.conf")},
		Style:  func(s, scheme string) { *styles = append(*styles, s+"/"+scheme) },
		Window: func(s windowsnapshot.Snapshot) { *windows = append(*windows, s) },
	}).(workspaceApp)
	next, _ := a.Update(tea.WindowSizeMsg{Width: 120, Height: 40})

	return next.(workspaceApp), styles, windows
}

func TestAClassicStyleGetsWhatTheWindowShows(t *testing.T) {
	a, styles, windows := styledApp(t, "mac-os-9")
	if len(*styles) != 1 || (*styles)[0] != "mac-os-9/default" || len(*windows) != 1 {
		t.Fatalf("styles %v, windows %+v", *styles, *windows)
	}
	next, _ := a.Update(workspace.PreferencesRequestedMsg{})

	// Another style chosen reaches the host at the next change.
	app := next.(workspaceApp).closePrefs(false)
	changed := app.cfg
	changed.WindowStyle = "windows-xp"
	app.apply(changed, false).Update(tea.KeyPressMsg{})
	if (*styles)[len(*styles)-1] != "windows-xp/blue" {
		t.Errorf("styles %v", *styles)
	}
}
