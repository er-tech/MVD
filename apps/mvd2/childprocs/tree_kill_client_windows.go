package childprocs

import (
	"os/exec"
	"strconv"
	"syscall"
)

// prepare hides the console window the program would open.
func prepare(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

// killTree ends the process and its children and grandchildren.
func killTree(pid int) {
	kill := exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/T", "/F")
	kill.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = kill.Run()
}
