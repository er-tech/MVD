package engine

import "errors"

// PlaylistSource is one URL from downloads.conf.
type PlaylistSource struct {
	Index int
	URL   string
}

// EntryInfo is the immutable description of an entry handed to renderers.
type EntryInfo struct {
	ID       int // global, sequential
	Playlist int // index into the playlist list
	Index    int // position inside the playlist (1 based)
	VideoID  string
	Title    string
	Channel  string
}

// Events emitted by the Engine. Renderers (TUI, plain log) consume them.
type (
	// EvPlaylistAdded is sent when AddSource queues a playlist after the engine
	// was built, before its listing starts. Playlists the engine was built with
	// are known from Sources() and send no such event.
	EvPlaylistAdded struct {
		Source PlaylistSource
	}
	// EvEntryRenamed is sent when a song was given another video (Swap) and the title and the
	// channel of that video are known: they are what the song is called from then on.
	EvEntryRenamed struct {
		Entry          int
		Title, Channel string
	}
	// EvPlaylistRemoved is sent when RemoveSource takes a playlist out of the run.
	EvPlaylistRemoved struct {
		Playlist int
	}
	// EvPlaylistListing is sent when the listing of a playlist starts.
	EvPlaylistListing struct {
		Playlist int
		URL      string
	}
	// EvPlaylistListed is sent once the flat listing of a playlist is known.
	EvPlaylistListed struct {
		Playlist int
		Title    string
		Entries  []EntryInfo
	}
	// EvPlaylistFailed is sent when a playlist could not be listed.
	EvPlaylistFailed struct {
		Playlist int
		Err      string
	}
	// EvEntryState is sent on every state transition of an entry.
	EvEntryState struct {
		Entry    int
		State    EntryState
		TargetID string // video actually downloaded (official or original)
		Official bool   // true when TargetID is the official video
		Better   bool   // true when TargetID is a better quality upload, not the official video
		Err      string // set for StateFailed
		// OwnOfficial is true when the upload itself is the official video.
		OwnOfficial bool
		// Reason says why the version was chosen, as the lookup put it; Artist and Title
		// are the song as a music database named it. Each is empty when not known.
		Reason        string
		Artist, Title string
		// Album is the album the song was named under, "" when it is not known.
		Album string
	}
	// EvQuality says how good the version being downloaded is: the height of its picture, in
	// pixels, and the bitrate of its sound, in kilobits a second. Each is 0 when not known.
	EvQuality struct {
		Entry     int
		Height    int
		AudioKbps int
	}
	// EvAudio says where the best audio step of a song is, when the setting asks for it: Word is
	// AudioWaiting, AudioReady, AudioFetching, AudioDone or AudioFailed.
	EvAudio struct {
		Entry int
		Word  string
	}
	// EvProgress carries a download progress tick.
	EvProgress struct {
		Entry      int
		Percent    float64
		Downloaded int64
		Total      int64
		Speed      float64 // bytes per second, 0 when unknown
		ETA        int     // seconds, -1 when unknown
		// Parts is how many parts of the file are coming at once: the fragments of a
		// part that is fragmented, up to concurrent_fragments, else one.
		Parts int
	}
	// EvLog is one line of output. Entry is -1 for playlist level lines.
	EvLog struct {
		Playlist int
		Entry    int
		Line     string
	}
	// EvIdle is sent when the queue is empty and no worker is busy.
	EvIdle struct{}
)

// The words of EvAudio.
const (
	// AudioWaiting is a song whose official video is not downloaded yet, so the best audio waits.
	AudioWaiting = "waiting"
	// AudioReady is a song whose version is chosen and whose best audio rate is known: EvQuality gives it.
	AudioReady = "ready"
	// AudioFetching is a song whose best audio is being fetched and put on the video.
	AudioFetching = "fetching"
	// AudioDone is a song whose video now has the best audio.
	AudioDone = "done"
	// AudioFailed is a song whose video stays as it was downloaded.
	AudioFailed = "not done"
)

// ErrBestAudioSkipped is what Options.AfterDownload returns when it did not try the best audio and has said why
// in the log: the engine does not log it again, and the song only shows the step as not done.
var ErrBestAudioSkipped = errors.New("best audio skipped")
