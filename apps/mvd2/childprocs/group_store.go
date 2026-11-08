package childprocs

import (
	"os/exec"
	"sync"
	"time"
)

// Group is the programs started and not yet stopped. It is safe for many goroutines. The zero value
// is ready to use.
type Group struct {
	mu   sync.Mutex
	runs []*running
}

type running struct {
	cmd  *exec.Cmd
	done chan struct{}
}

// Add starts cmd as a member of the group, with the settings that let Stop end its whole tree. It
// returns the error of the start, and the group holds nothing then. A caller must not call
// cmd.Wait: the group does.
func (g *Group) Add(cmd *exec.Cmd) error {
	prepare(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	r := &running{cmd: cmd, done: make(chan struct{})}
	go func() {
		_ = cmd.Wait()
		close(r.done)
	}()
	g.mu.Lock()
	g.runs = append(g.runs, r)
	g.mu.Unlock()
	return nil
}

// Stop ends every program of the group with its children and waits until each has ended or the
// timeout passes, whichever is first. It returns how many were still running at the timeout. It may
// be called again.
func (g *Group) Stop(timeout time.Duration) int {
	g.mu.Lock()
	runs := g.runs
	g.runs = nil
	g.mu.Unlock()
	for _, r := range runs {
		killTree(r.cmd.Process.Pid)
	}
	deadline := time.After(timeout)
	left := 0
	for i, r := range runs {
		select {
		case <-r.done:
		case <-deadline:
			left = len(runs) - i
			return left
		}
	}
	return left
}
