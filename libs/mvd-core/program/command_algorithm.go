package program

import "time"

// Batch returns the command that runs cmds together. Nil commands are left out: it is nil when
// none is left, and the command itself when one is.
func Batch(cmds ...Cmd) Cmd {
	var kept []Cmd
	for _, cmd := range cmds {
		if cmd != nil {
			kept = append(kept, cmd)
		}
	}
	switch len(kept) {
	case 0:
		return nil
	case 1:
		return kept[0]
	}

	return func() Msg { return BatchMsg(kept) }
}

// Tick returns the command that waits for d and then returns what fn makes of the time.
func Tick(d time.Duration, fn func(time.Time) Msg) Cmd {
	return func() Msg { return fn(<-time.After(d)) }
}

// Quit is the message that ends the program. Use it as a command by returning it from one.
func Quit() Msg { return QuitMsg{} }
