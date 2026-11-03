// Package program runs a model that has no terminal behind it. A model reacts to messages and
// answers with commands, which run on their own and bring back more messages. It is the small
// runtime the app's models need, in place of a terminal toolkit.
package program

// Msg is anything that happens to a model: a command's result, a tick, a request of the window.
type Msg = any

// Cmd is work a model asks for. It runs apart from the model and returns the message that
// reports its result, or nil when there is nothing to report.
type Cmd = func() Msg

// Model is what a program runs. Init returns the first command. Update handles one message and
// returns the next model and the command it asks for.
type Model interface {
	Init() Cmd
	Update(Msg) (Model, Cmd)
}

// WindowSizeMsg tells a model how much room its window has, in cells.
type WindowSizeMsg struct {
	Width, Height int
}

// QuitMsg ends the program that receives it.
type QuitMsg struct{}

// BatchMsg holds commands that run together, with no order between them.
type BatchMsg []Cmd
