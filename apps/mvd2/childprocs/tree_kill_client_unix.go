//go:build !windows

package childprocs

import (
	"os/exec"
	"syscall"
)

// prepare puts the program in a group of its own, so one signal reaches its whole tree.
func prepare(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// killTree ends the process group the process leads.
func killTree(pid int) {
	_ = syscall.Kill(-pid, syscall.SIGKILL)
}
