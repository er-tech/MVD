package terminalui

import (
	"context"
	"io"
	"path/filepath"

	tea "charm.land/bubbletea/v2"
)

// headlessWidth and headlessHeight are the size the program is told it has: nothing is drawn for
// a terminal, but the screens count in cells.
const (
	headlessWidth  = 120
	headlessHeight = 40
)

// ConfigPath is the settings file, the same one the terminal app uses.
func ConfigPath(appDir string) string {
	return filepath.Join(appDir, "config.conf")
}

// Program is the app's model running with no terminal behind it: the window is drawn by the page
// from what the model reports, and the page sends back what the person does.
type Program struct {
	program *tea.Program
}

// Start runs model at once, until ctx ends or the model quits.
//
// ctx: ends the program when it is cancelled.
// model: the app's model, as NewModelFactory makes it.
//
// It returns the way to send messages to the program.
func Start(ctx context.Context, model tea.Model) *Program {
	p := tea.NewProgram(model,
		tea.WithContext(ctx),
		tea.WithInput(nil),
		tea.WithOutput(io.Discard),
		tea.WithoutRenderer(),
		tea.WithoutSignalHandler(),
		tea.WithWindowSize(headlessWidth, headlessHeight),
	)
	go func() { _, _ = p.Run() }()
	go p.Send(tea.WindowSizeMsg{Width: headlessWidth, Height: headlessHeight})

	return &Program{program: p}
}

// Send delivers msg to the program.
func (p *Program) Send(msg tea.Msg) {
	p.program.Send(msg)
}
