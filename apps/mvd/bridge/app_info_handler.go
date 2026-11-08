package bridge

import "errors"

// CheckForUpdate looks for a newer version of the app now and returns the line to tell the person.
// It waits for the network.
func (a *App) CheckForUpdate() string {
	if a.host.CheckForUpdate == nil {
		return "This build cannot update itself."
	}

	return a.host.CheckForUpdate()
}

// UpdateNote is the line About adds when a newer version is known, "" for none.
func (a *App) UpdateNote() string {
	if a.host.UpdateNote == nil {
		return ""
	}

	return a.host.UpdateNote()
}

// SignInState says whether a YouTube sign-in is kept, "" where signing in is not offered.
func (a *App) SignInState() string {
	if a.host.SignInState == nil {
		return ""
	}

	return a.host.SignInState()
}

// SignIn opens the window to sign in to YouTube inside the app and returns what to tell the person.
// The error says it is not offered here, or why it failed.
func (a *App) SignIn() (string, error) {
	if a.host.SignIn == nil {
		return "", errors.New("signing in is not offered on this system")
	}

	return a.host.SignIn(a.context())
}

// StartupList is the .mvd file the app was started with, "" for none. The page opens it at start.
func (a *App) StartupList() string {
	return a.host.StartupList
}
