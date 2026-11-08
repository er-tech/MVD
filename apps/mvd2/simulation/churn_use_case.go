package simulation

import (
	"context"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/er-tech/MVD/libs/mvd-state/songrows"
)

// Churn fills the store with rows songs and then, every period, advances the progress of perTick
// random songs, until ctx ends. A song at 100 percent restarts at 0, so the load never stops.
//
// store receives the rows, rows is how many songs to make, perTick is how many songs change in each
// period, and every is the period. Churn returns when ctx ends.
func Churn(ctx context.Context, store *songrows.Store, rows, perTick int, every time.Duration) {
	songs := make([]songrows.Row, rows)
	for i := range songs {
		songs[i] = songrows.Row{
			ID:     fmt.Sprintf("song-%05d", i),
			Artist: fmt.Sprintf("Artist %d", i%250),
			Title:  fmt.Sprintf("Song number %d", i),
			Status: "waiting",
		}
		store.Set(songs[i])
	}
	tick := time.NewTicker(every)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			for n := 0; n < perTick; n++ {
				i := rand.IntN(rows)
				s := &songs[i]
				s.Percent = (s.Percent + 7) % 101
				s.Status = statusAt(s.Percent)
				store.Set(*s)
			}
		}
	}
}

// statusAt names the state of a song from its progress.
func statusAt(percent int) string {
	switch {
	case percent == 0:
		return "waiting"
	case percent >= 100:
		return "saved"
	default:
		return "downloading"
	}
}
