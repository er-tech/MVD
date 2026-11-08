//go:build !windows

package childprocs

import "syscall"

// alive says whether a process with the pid still runs.
func alive(pid int) bool {
	return syscall.Kill(pid, 0) == nil
}
