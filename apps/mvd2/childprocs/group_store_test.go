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

// TestHelperProcess is not a test: the tests below run the test binary again as a parent that starts
// a grandchild and waits.
func TestHelperProcess(t *testing.T) {
	switch os.Getenv("MVD2_HELPER") {
	case "parent":
		child := exec.Command(os.Args[0], "-test.run=TestHelperProcess")
		child.Env = append(os.Environ(), "MVD2_HELPER=sleep")
		if err := child.Start(); err != nil {
			os.Exit(2)
		}
		_ = os.WriteFile(os.Getenv("MVD2_PIDFILE"), []byte(strconv.Itoa(child.Process.Pid)), 0o600)
		time.Sleep(time.Minute)
	case "sleep":
		time.Sleep(time.Minute)
	}
}

func startParent(t *testing.T, g *Group) (parent, grandchild int) {
	t.Helper()
	pidfile := filepath.Join(t.TempDir(), "pid")
	cmd := exec.Command(os.Args[0], "-test.run=TestHelperProcess")
	cmd.Env = append(os.Environ(), "MVD2_HELPER=parent", "MVD2_PIDFILE="+pidfile)
	if err := g.Add(cmd); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 200; i++ {
		if data, err := os.ReadFile(pidfile); err == nil && len(data) > 0 {
			n, _ := strconv.Atoi(strings.TrimSpace(string(data)))
			return cmd.Process.Pid, n
		}
		time.Sleep(25 * time.Millisecond)
	}
	t.Fatal("the helper never wrote the pid of its child")
	return 0, 0
}

func TestStopEndsTheProgramAndItsChildQuickly(t *testing.T) {
	var g Group
	parent, grandchild := startParent(t, &g)
	if !alive(parent) || !alive(grandchild) {
		t.Fatal("the helpers are not running")
	}
	started := time.Now()
	if left := g.Stop(2 * time.Second); left != 0 {
		t.Fatalf("%d programs still running", left)
	}
	if took := time.Since(started); took > 2*time.Second {
		t.Fatalf("stop took %v", took)
	}
	time.Sleep(200 * time.Millisecond)
	if alive(parent) || alive(grandchild) {
		t.Fatal("a process is left after stop")
	}
}

func TestStopOnAnEmptyGroupReturnsAtOnce(t *testing.T) {
	var g Group
	if left := g.Stop(time.Second); left != 0 {
		t.Fatalf("left %d", left)
	}
}

func TestAddReportsAProgramThatDoesNotStart(t *testing.T) {
	var g Group
	if err := g.Add(exec.Command(filepath.Join(t.TempDir(), "missing"))); err == nil {
		t.Fatal("no error for a missing program")
	}
}
