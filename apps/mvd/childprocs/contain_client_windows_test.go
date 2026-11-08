package childprocs

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// TestHelperProcess is not a test: the contained app starts the test binary again as a child that
// sleeps.
func TestHelperProcess(t *testing.T) {
	if os.Getenv("MVD2_HELPER") == "sleep" {
		time.Sleep(time.Minute)
	}
}

// TestContainedAppHelper is not a test: the test below runs the test binary again as an app that
// contains itself, starts a grandchild and ends.
func TestContainedAppHelper(t *testing.T) {
	if os.Getenv("MVD2_CONTAIN") != "app" {
		return
	}
	if err := Contain(); err != nil {
		os.Exit(3)
	}
	child := exec.Command(os.Args[0], "-test.run=TestHelperProcess")
	child.Env = append(os.Environ(), "MVD2_HELPER=sleep")
	if err := child.Start(); err != nil {
		os.Exit(2)
	}
	_ = os.WriteFile(os.Getenv("MVD2_PIDFILE"), []byte(strconv.Itoa(child.Process.Pid)), 0o600)
	os.Exit(0)
}

func TestAProgramThatEndsTakesItsChildrenWithIt(t *testing.T) {
	pidfile := filepath.Join(t.TempDir(), "pid")
	app := exec.Command(os.Args[0], "-test.run=TestContainedAppHelper")
	app.Env = append(os.Environ(), "MVD2_CONTAIN=app", "MVD2_PIDFILE="+pidfile)
	if err := app.Run(); err != nil {
		t.Fatalf("the contained app failed: %v", err)
	}
	data, err := os.ReadFile(pidfile)
	if err != nil {
		t.Fatal(err)
	}
	grandchild, _ := strconv.Atoi(strings.TrimSpace(string(data)))
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(25 * time.Millisecond) {
		if !alive(grandchild) {
			return
		}
	}
	t.Fatal("the child of the app is still running two seconds after the app ended")
}
