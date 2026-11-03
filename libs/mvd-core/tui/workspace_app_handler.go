package tui

import (
	"reflect"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/prefsform"
	"youtube-downloader/libs/mvd-core/prefspopup"
	"youtube-downloader/libs/mvd-core/program"
	"youtube-downloader/libs/mvd-core/workspace"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// WorkspaceInput seeds the workspace app.
type WorkspaceInput struct {
	Setup SetupInput
	Host  workspace.Host
	// List is the list to open with, nil for a new one.
	List *downloadlist.Session
	// Live is the settings a run reads again at every download, taken from the config.
	Live func(config.Config) engine.LiveSettings
	// Modal, when set, is called with true when a window opens over the main one and false when the
	// last one closes, so a host can dim what is around it.
	Modal func(open bool)
	// Style, when set, is called with the window style of the settings and its colour scheme when
	// the app starts and whenever either changes. Window is then called with what the window shows
	// after every change, for the host to draw.
	Style  func(style, scheme string)
	Window func(windowsnapshot.Snapshot)
	// Preferences, when set, is called after every change with the preferences as a window draws
	// them while they are open, and nil once they close.
	Preferences func(*prefsform.Window)
	// Remember, when set, is called with the file of the list, "" while it has none, when the app
	// starts and whenever that changes, so the next start can open the same list again.
	Remember func(path string)
}

// NewWorkspaceApp returns the app whose main window is the workspace: the download list under a
// menu bar. The preferences open over it from the File menu.
func NewWorkspaceApp(in WorkspaceInput) program.Model {
	a := workspaceApp{in: in, ws: workspace.New(in.Host, in.Setup.Cfg, in.List), cfg: in.Setup.Cfg}
	if in.Setup.OpenConfig {
		a = a.openPrefs() // the first run: the settings have never been looked at
		a.prefs = a.prefs.WithWelcome()
	}
	return a
}

type workspaceApp struct {
	in      WorkspaceInput
	ws      workspace.Model
	cfg     config.Config
	prefs   prefspopup.Model
	inPrefs bool
	// modal is whether a window was last reported open to Modal, style the window style last
	// reported to Style, and listed the file of the list last reported to Remember.
	modal  *bool
	style  *string
	listed *string
}

// Init returns the first commands of the workspace.
func (a workspaceApp) Init() program.Cmd { return a.ws.Init() }

// Update handles msg and returns the next model and its command. It tells the host when a window
// opens or closes, when the window style changes and when the file of the list changes.
func (a workspaceApp) Update(msg program.Msg) (program.Model, program.Cmd) {
	next, cmd := a.update(msg)
	if app, ok := next.(workspaceApp); ok && app.in.Modal != nil {
		open := app.inPrefs || app.ws.WindowOpen()
		if app.modal == nil || *app.modal != open {
			app.in.Modal(open)
			app.modal = &open
		}
		next = app
	}
	if app, ok := next.(workspaceApp); ok && app.in.Style != nil {
		next = app.report()
	}
	if app, ok := next.(workspaceApp); ok && app.in.Remember != nil {
		if path := app.ws.ListPath(); app.listed == nil || *app.listed != path {
			app.in.Remember(path)
			app.listed = &path
		}
		next = app
	}
	return next, cmd
}

// report tells the host the window style when it changed, and what the window shows.
func (a workspaceApp) report() workspaceApp {
	style := a.cfg.WindowStyle
	if !config.ValidWindowStyle(style) {
		style = config.DefaultWindowStyle
	}
	scheme := config.WindowSchemeOf(style, a.cfg.WindowScheme)
	if reported := style + "/" + scheme; a.style == nil || *a.style != reported {
		a.in.Style(style, scheme)
		a.style = &reported
	}
	if a.in.Preferences != nil {
		if a.inPrefs {
			w := a.prefs.Window()
			w.Pending = a.waitsForSave(a.prefs.Config())
			a.in.Preferences(&w)
		} else {
			a.in.Preferences(nil)
		}
	}
	if a.in.Window == nil {
		return a
	}
	a.in.Window(a.ws.Window())

	return a
}

func (a workspaceApp) update(msg program.Msg) (program.Model, program.Cmd) {
	switch msg := msg.(type) {
	case program.WindowSizeMsg:
		next, cmd := a.ws.Update(msg)
		a.ws = next.(workspace.Model)
		return a, cmd
	case workspace.PreferencesRequestedMsg:
		return a.openPrefs(), nil
	case prefspopup.CloseMsg:
		return a.closePrefs(false), nil
	case prefspopup.SaveMsg:
		return a.closePrefs(true), nil
	case prefspopup.WindowIntentMsg:
		if !a.inPrefs {
			return a, nil
		}
		var cmd program.Cmd
		a.prefs, cmd = a.prefs.Update(msg)
		// Each change is kept and goes to the run at once; the places the files go to and the
		// pattern of their names wait for the person to confirm with save.
		return a.apply(a.prefs.Config(), false), cmd
	}
	if a.inPrefs && !workspace.Background(msg) {
		var cmd program.Cmd
		a.prefs, cmd = a.prefs.Update(msg)
		return a.apply(a.prefs.Config(), false), cmd
	}
	next, cmd := a.ws.Update(msg)
	a.ws = next.(workspace.Model)
	return a, cmd
}

// openPrefs shows the preferences over the workspace.
func (a workspaceApp) openPrefs() workspaceApp {
	a.prefs = prefspopup.New(a.cfg, a.popupHost())
	a.inPrefs = true
	return a
}

// closePrefs takes the preferences away; with confirm, the places the files go to and the
// pattern of their names are kept too.
func (a workspaceApp) closePrefs(confirm bool) workspaceApp {
	chosen := a.prefs.Config()
	switch {
	case confirm:
		a = a.apply(chosen, true)
		a.ws = a.ws.Confirm("Preferences saved")
	case a.waitsForSave(chosen):
		a.ws = a.ws.Caution("The folder or file names you changed were not kept. Save them in Preferences.")
	}
	a.inPrefs = false
	return a
}

// waitsForSave says whether the preferences chosen differ from the ones in use in the settings
// that are only kept when the person saves: where the files go to and how they are named.
func (a workspaceApp) waitsForSave(chosen config.Config) bool {
	return chosen.OutputDir != a.cfg.OutputDir ||
		chosen.OutputTemplate != a.cfg.OutputTemplate ||
		chosen.LogDir != a.cfg.LogDir
}

// popupHost is what the preferences ask of the machine: a folder chooser, and moving and
// removing the app.
func (a workspaceApp) popupHost() prefspopup.Host {
	in := a.in.Setup
	host := prefspopup.Host{StylesWindow: a.in.Style != nil}
	if in.PickFolder != nil {
		host.PickFolder = in.PickFolder
	}
	if in.Move != nil {
		move := in.Move
		host.Move = func() (string, error) {
			outcome, err := move()
			return movingResult(outcome, err)
		}
	}
	host.SignIn, host.SignInState = in.SignIn, in.SignInState
	if in.Uninstall != nil {
		uninstall := in.Uninstall
		host.Uninstall = func() (string, error) {
			outcome, err := uninstall()
			return removalResult(outcome, err)
		}
	}
	return host
}

// apply takes cfg as the settings, keeping the places and the name pattern as they were
// unless confirmed; it writes them to the config file and tells the run.
func (a workspaceApp) apply(cfg config.Config, confirmed bool) workspaceApp {
	if !confirmed {
		cfg.OutputDir, cfg.OutputTemplate, cfg.LogDir = a.cfg.OutputDir, a.cfg.OutputTemplate, a.cfg.LogDir
	}
	if reflect.DeepEqual(cfg, a.cfg) {
		return a
	}
	a.cfg = cfg
	_ = config.Save(cfg, a.in.Setup.CfgPath)
	live := engine.LiveSettings{}
	if a.in.Live != nil {
		live = a.in.Live(cfg)
	}
	a.ws = a.ws.Reconfigure(cfg, live)
	return a
}
