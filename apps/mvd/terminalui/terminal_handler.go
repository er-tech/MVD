package terminalui

import (
	"context"
	"path/filepath"
	"youtube-downloader/libs/mvd-core/program"
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
	program *program.Program
	done    chan struct{}
}

// Start runs model at once, until ctx ends or the model quits.
//
// ctx: ends the program when it is cancelled.
// model: the app's model, as NewModelFactory makes it.
//
// It returns the way to send messages to the program.
func Start(ctx context.Context, model program.Model) *Program {
	p := program.New(model)
	done := make(chan struct{})
	go func() { defer close(done); _, _ = p.Run(ctx) }()
	go p.Send(program.WindowSizeMsg{Width: headlessWidth, Height: headlessHeight})

	return &Program{program: p, done: done}
}

// Send delivers msg to the program.
func (p *Program) Send(msg program.Msg) {
	p.program.Send(msg)
}

// Wait returns once the program has ended: its context was cancelled or the model quit.
func (p *Program) Wait() { <-p.done }
