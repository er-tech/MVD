package bridge

import (
	"errors"
	"path/filepath"

	"youtube-downloader/apps/mvd/runhost"
)

// listFileName is the name the save window offers.
const listFileName = "my-music.mvd"

// NewList stops the run and empties the list.
func (a *App) NewList() {
	a.session.NewList()
}

// OpenListFile asks for a .mvd file and opens it as the list. It returns the path opened, or ""
// when the person cancelled. The error says why the file could not be opened.
func (a *App) OpenListFile() (string, error) {
	if err := a.toolsError(); err != nil {
		return "", err
	}
	if a.host.PickListFile == nil {
		return "", errors.New("this system has no window to choose a file")
	}
	path, err := a.host.PickListFile(a.context())
	if err != nil || path == "" {
		return "", err
	}

	return path, a.session.OpenList(path)
}

// OpenListPath opens the .mvd file at path as the list, without a window to choose it. The page
// uses it for the list kept for recovery and for a file the system opened with the app.
func (a *App) OpenListPath(path string) error {
	if err := a.toolsError(); err != nil {
		return err
	}

	return a.session.OpenList(path)
}

// SaveList saves the list in the file it already has. The error says the list has no file yet, or
// why the file could not be written.
func (a *App) SaveList() error {
	path := a.session.ListPath()
	if path == "" {
		return errors.New("the list has no file yet: use Save as")
	}

	return a.session.SaveList(path)
}

// SaveListAs asks where to save the list and saves it there. It returns the path, or "" when the
// person cancelled. The error says why the file could not be written.
func (a *App) SaveListAs() (string, error) {
	if a.host.PickSaveFile == nil {
		return "", errors.New("this system has no window to choose a file")
	}
	path, err := a.host.PickSaveFile(a.context(), listFileName)
	if err != nil || path == "" {
		return "", err
	}
	if filepath.Ext(path) == "" {
		path += ".mvd"
	}

	return path, a.session.SaveList(path)
}

// ListPath is the file of the list, "" while it has none.
func (a *App) ListPath() string {
	return a.session.ListPath()
}

// Recovery says what the last run left, or null when there is nothing to take up again.
func (a *App) Recovery() *runhost.ListInfo {
	info, found := a.session.Recovery()
	if !found {
		return nil
	}

	return &info
}

// DiscardRecovery forgets the list the last run left.
func (a *App) DiscardRecovery() {
	a.session.DiscardRecovery()
}
