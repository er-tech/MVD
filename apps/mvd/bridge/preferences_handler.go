package bridge

import (
	"errors"
	"slices"

	"youtube-downloader/apps/mvd/preferences"
)

// GetPreferences returns the settings the Preferences window shows.
func (a *App) GetPreferences() preferences.Preferences {
	return a.prefs.Get()
}

// GetPreferenceOptions returns the choices of the fields that offer a list, and which actions this
// system offers.
func (a *App) GetPreferenceOptions() preferences.Options {
	options := preferences.OptionsOf()
	options.CanSignIn = a.host.SignIn != nil
	options.CanMove = a.host.Move != nil
	options.CanUninstall = a.host.Uninstall != nil
	if !options.CanSignIn {
		// The sign-in made inside the app is only there where the app can do it.
		options.CookieSources = slices.DeleteFunc(slices.Clone(options.CookieSources), func(source string) bool { return source == "mvd" })
	}

	return options
}

// MoveApp offers to move the app to its own folder and returns what to tell the person. The error
// says it is not offered here, or why it failed.
func (a *App) MoveApp() (string, error) {
	if a.host.Move == nil {
		return "", errors.New("the app cannot be moved on this system")
	}

	return a.host.Move(a.context())
}

// UninstallApp asks whether to remove the app and starts the removal when the person agrees. The
// error says it is not offered here, or why it failed.
func (a *App) UninstallApp() (string, error) {
	if a.host.Uninstall == nil {
		return "", errors.New("the app cannot be removed on this system")
	}

	return a.host.Uninstall(a.context())
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
