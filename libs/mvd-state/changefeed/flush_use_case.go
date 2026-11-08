package changefeed

import (
	"context"
	"time"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

// Run drains the store every period and calls emit with each batch, until ctx ends. A period with
// no change calls nothing, so an idle app does no work beyond the tick. emit runs on the loop's
// goroutine: a slow emit delays the next batch and loses no change, because the store keeps the
// newest value of each row meanwhile.
//
// store is the rows to watch, every is the time between two drains and must be above zero, and emit
// receives each batch in order. Run returns when ctx ends.
func Run(ctx context.Context, store *library.Store, every time.Duration, emit func(library.Batch)) {
	tick := time.NewTicker(every)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if batch, ok := store.Drain(); ok {
				emit(batch)
			}
		}
	}
}
