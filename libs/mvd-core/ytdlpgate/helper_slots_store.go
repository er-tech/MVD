// Package ytdlpgate limits how many helper yt-dlp processes run at once.
package ytdlpgate

import "context"

// helperLimit is how many look-ups (listing, title, probe, page dump) run at once, beside
// the downloads, which the engine limits itself. Each yt-dlp start unpacks a bundled
// Python, so a burst of them keeps every core busy.
const helperLimit = 1

var slots = make(chan struct{}, helperLimit)

// Acquire waits for a free slot and returns the function that gives it back.
// It returns ctx.Err() when ctx ends first.
func Acquire(ctx context.Context) (release func(), err error) {
	select {
	case slots <- struct{}{}:
		return func() { <-slots }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
