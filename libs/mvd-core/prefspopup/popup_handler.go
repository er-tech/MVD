package prefspopup

import (
	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/prefsform"
	"youtube-downloader/libs/mvd-core/program"
)

// Model is the preferences: the form (package prefsform) holds the tabs, the settings and what the
// person is doing to them, and this runs the host's part of it (a folder chooser, an action) off
// the model's goroutine. A change is in Config as soon as it is made; nothing is written here.
type Model struct {
	form prefsform.Form
	host Host
}

// New returns the preferences for cfg, on the first tab.
func New(cfg config.Config, host Host) Model {
	return Model{form: prefsform.New(cfg, capabilities(host)), host: host}
}

// capabilities are what the host can do, as the form asks for it.
func capabilities(host Host) prefsform.Capabilities {
	state := ""
	if host.SignInState != nil {
		state = host.SignInState()
	}

	return prefsform.Capabilities{SignInState: state, CanPickFolder: host.PickFolder != nil, CanMove: host.Move != nil, CanUninstall: host.Uninstall != nil, CanSignIn: host.SignIn != nil, CanStyleWindow: host.StylesWindow}
}

// Config is the settings as changed so far.
func (m Model) Config() config.Config { return m.form.Cfg }

// Update handles msg and returns the next preferences and its command.
func (m Model) Update(msg program.Msg) (Model, program.Cmd) {
	switch msg := msg.(type) {
	case WindowIntentMsg:
		return m.windowIntent(prefsform.WindowIntent(msg))
	case pickedMsg:
		m.form.Picked(msg.field, msg.path, msg.chosen, msg.err)

		return m, nil
	case doneMsg:
		m.form.ActionDone(msg.message, msg.err)
	}

	return m, nil
}

// WindowIntentMsg is what the person did in the preferences window the page draws.
type WindowIntentMsg prefsform.WindowIntent

// Window is the preferences as a window draws them.
func (m Model) Window() prefsform.Window { return m.form.Window() }

// windowIntent does what the person did in the window; the host's part (a folder chooser, an
// action) is started as a command.
func (m Model) windowIntent(in prefsform.WindowIntent) (Model, program.Cmd) {
	switch in.Kind {
	case prefsform.IntentSave:
		return m, func() program.Msg { return SaveMsg{} }
	case prefsform.IntentClose:
		return m, func() program.Msg { return CloseMsg{} }
	}

	return m.hostDoes(m.form.Apply(in))
}

// hostDoes begins what the form asked: the host's folder chooser or action.
func (m Model) hostDoes(effect prefsform.Effect) (Model, program.Cmd) {
	switch e := effect.(type) {
	case prefsform.PickFolder:
		pick := m.host.PickFolder

		return m, func() program.Msg {
			path, chosen, err := pick(e.Start)

			return pickedMsg{field: e.Field, path: path, chosen: chosen, err: err}
		}
	case prefsform.RunAction:
		run := m.host.Move
		switch e.Kind {
		case prefsform.ActionUninstall:
			run = m.host.Uninstall
		case prefsform.ActionSignIn:
			run = m.host.SignIn
		}

		return m, func() program.Msg {
			message, err := run()

			return doneMsg{message: message, err: err}
		}
	}

	return m, nil
}

// WithConfig replaces the settings being edited.
func (m Model) WithConfig(cfg config.Config) Model {
	m.form = m.form.WithConfig(cfg)

	return m
}

// WithWelcome makes the preferences of the first start: the window tells the person what to do
// until they have done something of their own.
func (m Model) WithWelcome() Model {
	m.form = m.form.WithWelcome()

	return m
}
