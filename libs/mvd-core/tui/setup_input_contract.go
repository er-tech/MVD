package tui

import "youtube-downloader/libs/mvd-core/config"

// SetupInput seeds the setup screens.
type SetupInput struct {
	Cfg        config.Config
	URLs       []string
	CfgPath    string
	ListPath   string
	OpenConfig bool // start on the config screen (first run)
	// PickFolder, when set, is the operating system's folder chooser, which the
	// folder settings open instead of the built-in folder browser.
	PickFolder FolderPicker
	// Uninstall, when set, is offered on the preferences: it asks the person on the
	// machine's own screen and removes the app if they agree.
	Uninstall Uninstaller
	// Move, when set, is offered on the preferences: it asks the person on the machine's
	// own screen where the app should live and moves it there if they agree.
	Move Mover
	// SignIn, when set, is offered on the preferences: it opens a window to sign in to YouTube
	// and says what came of it.
	SignIn func() (message string, err error)
	// SignInState says what the last sign-in came to, for the preferences to show.
	SignInState func() string
}
