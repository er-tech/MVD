package bridge

import (
	"errors"

	"youtube-downloader/apps/mvd/preferences"
)

// GetPreferences returns the settings the Preferences window shows.
func (a *App) GetPreferences() preferences.Preferences {
	return a.prefs.Get()
}

// GetPreferenceOptions returns the choices of the fields that offer a list.
func (a *App) GetPreferenceOptions() preferences.Options {
	return preferences.OptionsOf()
}

// SetPreferences checks the settings and keeps them. A change counts from the next list. The error
// says which field is wrong.
func (a *App) SetPreferences(p preferences.Preferences) error {
	return a.prefs.Set(p)
}

// PickOutputFolder asks for the folder the songs are saved in and returns it, or "" when the person
// cancelled.
func (a *App) PickOutputFolder() (string, error) {
	if a.host.PickFolder == nil {
		return "", errors.New("this system has no window to choose a folder")
	}

	return a.host.PickFolder(a.context(), a.prefs.Get().OutputDir)
}
