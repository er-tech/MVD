package runhost

import (
	"fmt"
	"strconv"
	"strings"

	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runstate"
	"youtube-downloader/libs/mvd-core/songlist"

	"github.com/er-tech/MVD/libs/mvd-state/library"
)

const (
	sourcePrefix = "p"
	songPrefix   = "e"
)

// sourceID is the page's ID of the playlist the engine counts as index.
func sourceID(index int) string { return sourcePrefix + strconv.Itoa(index) }

// songID is the page's ID of the entry the engine counts as id.
func songID(id int) string { return songPrefix + strconv.Itoa(id) }

// parseID reads an ID made by sourceID or songID. It says false for any other text.
func parseID(prefix, id string) (int, bool) {
	rest, found := strings.CutPrefix(id, prefix)
	if !found {
		return 0, false
	}
	n, err := strconv.Atoi(rest)

	return n, err == nil && n >= 0
}

// toneName is the name of a tone on the page.
func toneName(tone songlist.Tone) string {
	switch tone {
	case songlist.ToneDim:
		return "dim"
	case songlist.ToneFocus:
		return "focus"
	case songlist.ToneHighlight:
		return "highlight"
	case songlist.ToneSuccess:
		return "success"
	case songlist.ToneError:
		return "error"
	}

	return "text"
}

// versionOf says which video a song takes, "" while it is not known.
func versionOf(en *runstate.Entry) string {
	switch {
	case en.Official || en.OwnOfficial:
		return "official"
	case en.Better:
		return "better"
	case songlist.Unavailable(en):
		return ""
	case en.State == engine.StatePlanned || en.State == engine.StateAccepted || en.State == engine.StateDownloading ||
		en.State == engine.StateMerging || en.State == engine.StateDone:
		return "original"
	}

	return ""
}

// songRow is the table row of an entry.
func songRow(en *runstate.Entry) library.Song {
	artist, title := en.Channel, en.Title
	if en.NamedArtist != "" {
		artist, title = en.NamedArtist, en.NamedTitle
	}
	word, tone := songlist.StatusWord(en)

	return library.Song{
		ID:        songID(en.ID),
		SourceID:  sourceID(en.Playlist),
		Position:  en.Index,
		Artist:    artist,
		Title:     title,
		Status:    word,
		Tone:      toneName(tone),
		Percent:   int(en.Percent),
		Speed:     int(en.Speed),
		Version:   versionOf(en),
		Height:    en.Height,
		AudioKbps: en.AudioKbps,
		Error:     runstate.PlainError(en.Err),
	}
}

// sourceRow is the list row of a playlist, with its counts.
func sourceRow(st *runstate.State, pl *runstate.Playlist) library.Source {
	_, failed, _ := st.PlaylistTally(pl)
	status := "listing"
	switch {
	case pl.Err != "":
		status = "failed"
	case pl.Listed:
		status = "listed"
	}

	return library.Source{
		ID:      sourceID(pl.Index),
		URL:     pl.URL,
		Title:   titleOf(st, pl),
		Status:  status,
		Error:   runstate.PlainError(pl.Err),
		Songs:   len(pl.Entries),
		Done:    st.PlaylistDownloaded(pl),
		Failed:  failed,
		Finding: findingIn(st, pl),
	}
}

// findingIn is how many songs of a playlist are being looked up now.
func findingIn(st *runstate.State, pl *runstate.Playlist) int {
	finding := 0
	for _, id := range pl.Entries {
		if en := st.Entry(id); en != nil && (en.State == engine.StateResolving || en.State == engine.StatePicking) {
			finding++
		}
	}

	return finding
}

// titleOf is the name of a playlist. A single song has no playlist title, so it is called by its song.
func titleOf(st *runstate.State, pl *runstate.Playlist) string {
	if pl.Listed && pl.Title == pl.URL && len(pl.Entries) == 1 {
		if en := st.Entry(pl.Entries[0]); en != nil && en.Title != "" {
			return en.Title
		}
	}

	return pl.Title
}

// runOf is the state of the run for the footer. started and paused are the person's choices.
func runOf(st *runstate.State, started, paused bool) library.Run {
	tally := st.Tally()
	run := library.Run{
		Started: started,
		Paused:  paused,
		Sources: len(st.Playlists),
		Songs:   tally.Total,
		Done:    tally.Done + tally.Duplicate,
		Failed:  tally.Failed,
		Active:  tally.Running,
		Speed:   int(tally.Speed),
	}
	switch {
	case len(st.Playlists) == 0:
		run.Phase = "empty"
	case !st.AllListed() || (!started && (tally.Queued > 0 || tally.Running > 0)):
		run.Phase = "loading"
	case !started:
		run.Phase = "ready"
	case st.Idle:
		run.Phase = "finished"
	default:
		run.Phase = "downloading"
	}

	return run
}

// describe is a short line for an error that names what failed.
func describe(what string, err error) error { return fmt.Errorf("%s: %w", what, err) }
