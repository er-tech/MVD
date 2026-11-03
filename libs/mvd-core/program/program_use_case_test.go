package program

import (
	"context"
	"testing"
	"time"
)

// counter counts the "go" messages it gets and asks for the next one, until it has three.
type counter struct{ seen []string }

func (c counter) Init() Cmd { return func() Msg { return "go" } }

func (c counter) Update(msg Msg) (Model, Cmd) {
	c.seen = append(c.seen, msg.(string))
	if len(c.seen) == 3 {
		return c, Quit
	}

	return c, Batch(nil, func() Msg { return "go" })
}

func TestAProgramRunsTheCommandsOfItsModelUntilItQuits(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	model, err := New(counter{}).Run(ctx)
	if err != nil || len(model.(counter).seen) != 3 {
		t.Fatalf("seen %v, err %v", model.(counter).seen, err)
	}
}

func TestAProgramEndsWhenItsContextEnds(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := New(counter{}).Run(ctx); err == nil {
		t.Fatal("the program did not report that its context ended")
	}
}

func TestBatchLeavesOutNilCommandsAndTickWaits(t *testing.T) {
	if Batch(nil, nil) != nil {
		t.Error("a batch of nothing is not nil")
	}
	one := func() Msg { return 1 }
	if got := Batch(nil, one)(); got != 1 {
		t.Errorf("a batch of one returned %v", got)
	}
	if _, ok := Batch(one, one)().(BatchMsg); !ok {
		t.Error("a batch of two is not a BatchMsg")
	}
	start := time.Now()
	if Tick(20*time.Millisecond, func(time.Time) Msg { return "tick" })() != "tick" || time.Since(start) < 20*time.Millisecond {
		t.Error("Tick did not wait")
	}
}
