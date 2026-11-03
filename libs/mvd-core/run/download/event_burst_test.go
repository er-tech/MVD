package download

import (
	"testing"

	"youtube-downloader/libs/mvd-core/engine"
)

func TestABurstOfEventsIsOneMessage(t *testing.T) {
	ch := make(chan interface{}, 1024)
	for i := 0; i < 500; i++ {
		ch <- engine.EvProgress{Entry: i, Percent: 1}
	}

	msg, ok := waitEvent(ch)().(evMsg)

	if !ok {
		t.Fatalf("the message is %T, not an event", waitEvent(ch)())
	}
	if got := 1 + len(msg.more); got != maxBurst+1 {
		t.Errorf("a message took %d events, want %d (the burst limit)", got, maxBurst+1)
	}
	if left := len(ch); left != 500-maxBurst-1 {
		t.Errorf("%d events are left for the next message, want %d", left, 500-maxBurst-1)
	}
}

func TestAnEventThatArrivesAloneIsAMessageOfItsOwn(t *testing.T) {
	ch := make(chan interface{}, 4)
	ch <- engine.EvIdle{}

	msg := waitEvent(ch)().(evMsg)

	if len(msg.more) != 0 {
		t.Errorf("%d extra events, want none", len(msg.more))
	}
}

func TestAClosedChannelIsSaidAfterTheEventsBeforeIt(t *testing.T) {
	ch := make(chan interface{}, 4)
	ch <- engine.EvIdle{}
	close(ch)

	if _, ok := waitEvent(ch)().(evMsg); !ok {
		t.Fatal("the event before the close was lost")
	}
	if _, ok := waitEvent(ch)().(evClosed); !ok {
		t.Error("the close was not said")
	}
}
