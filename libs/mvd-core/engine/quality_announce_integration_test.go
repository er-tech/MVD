package engine

import (
	"context"
	"testing"
)

func TestTheQualityOfAChosenVersionIsShownBeforeAnythingIsDownloaded(t *testing.T) {
	eng := stubEngine(t, true, "https://youtube.com/playlist?list=A")
	eng.opts.PlanOnly = true
	eng.opts.AfterDownload = nil
	eng.opts.ProbeQuality = func(string) (int, int, error) { return 1080, 256, nil }
	eng.live = liveOf(eng.opts)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { eng.Run(ctx); close(done) }()
	events := collect(t, eng)
	cancel()
	<-done

	read := 0
	for _, ev := range events {
		if q, ok := ev.(EvQuality); ok && q.Height == 1080 && q.AudioKbps == 256 {
			read++
		}
	}
	if read == 0 {
		t.Fatal("no quality was shown for a chosen version in a plan-only run")
	}
}
