package runhost

import (
	"context"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"
)

// Engine is what the session needs from the download engine. *engine.Engine is one; a test gives a
// fake, so the session is tested with no yt-dlp.
type Engine interface {
	// Events is the channel of what happens; it is closed when Run ends.
	Events() <-chan interface{}
	// Run lists, finds and downloads until ctx ends.
	Run(ctx context.Context)
	// Sources are the playlists the engine knows, in order.
	Sources() []engine.PlaylistSource
	// AddSource queues one more link and says false once the engine has ended.
	AddSource(url string) (engine.PlaylistSource, bool)
	// RemoveSource takes a playlist out of the run.
	RemoveSource(playlist int) bool
	// Release sends a held song to the downloads.
	Release(entry int, videoID string) bool
	// Swap gives a song another video to download and says false when the song cannot take one now.
	Swap(entry int, videoID string) bool
	// ReleaseAll sends every held song to the downloads and says how many.
	ReleaseAll() int
	// Pause holds the downloads that have not begun; Resume lets them go on.
	Pause()
	Resume()
	// RetryAll queues the failed songs again and says how many.
	RetryAll() int
	// Snapshot is how far each song has got, to write the list file.
	Snapshot() []engine.EntrySnapshot
}

// Build makes an engine for the settings, ready to hold what it finds until it is released.
// sources are the links it starts with, and plan the songs of a list opened from a file, which are
// not looked for again. Either may be empty.
type Build func(ctx context.Context, cfg config.Config, sources []string, plan []engine.PlannedEntry) (Engine, error)
