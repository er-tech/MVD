package songlist

import (
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runstate"
)

// StatusWord is the word that says where a song is, and the tone it carries.
func StatusWord(en *runstate.Entry) (word string, tone Tone) {
	switch en.State {
	case engine.StateQueued:
		return "waiting", ToneDim
	case engine.StateResolving:
		return "finding", ToneFocus
	case engine.StateDownloading:
		if en.Total > 0 {
			return "downloading", ToneHighlight
		}

		return "starting", ToneHighlight
	case engine.StateMerging:
		return "joining", ToneHighlight
	case engine.StateDuplicate:
		return "have it", ToneDim
	case engine.StateNotFound:
		return "no official", ToneDim
	case engine.StateFailed:
		return "failed", ToneError
	case engine.StatePlanned:
		return plannedWord(en)
	case engine.StateAccepted:
		return "accepted", ToneFocus
	case engine.StateSkipped:
		return "rejected", ToneDim
	case engine.StateDone:
		switch {
		case en.Official:
			return "official", ToneFocus
		case en.Better:
			return "better", ToneFocus
		}

		return "saved", ToneSuccess
	}

	return "", ToneText
}

// plannedWord is what the status of a song that waits says of what was found: whether there is an
// official video, so the person knows whether they can accept it without a look.
func plannedWord(en *runstate.Entry) (word string, tone Tone) {
	switch {
	case en.Official:
		return "official found", ToneSuccess
	case en.OwnOfficial:
		return "official video", ToneSuccess
	case en.Better:
		return "better found", ToneFocus
	}

	return "original upload", ToneHighlight
}

// StateWord is the word that says where a song is in the work, with nothing of which video it is:
// that is VersionWord. It is what the Status column shows.
func StateWord(en *runstate.Entry) (word string, tone Tone) {
	switch en.State {
	case engine.StateNotFound:
		return "not found", ToneDim
	case engine.StatePlanned:
		return "to review", ToneHighlight
	case engine.StateDone:
		return "saved", ToneSuccess
	}

	return StatusWord(en)
}

// VersionWord is which video a song has, once it is known: the official one, a better one than the
// upload, the artist's own official upload, or the original upload. It is empty until then, and the
// word "none" says no official video was found.
func VersionWord(en *runstate.Entry) (word string, tone Tone) {
	switch {
	case en.State == engine.StateNotFound:
		return "none", ToneDim
	case en.Official:
		return "official", ToneSuccess
	case en.OwnOfficial:
		return "official video", ToneSuccess
	case en.Better:
		return "better", ToneFocus
	}
	switch en.State {
	case engine.StatePlanned, engine.StateAccepted, engine.StateDownloading, engine.StateMerging, engine.StateDone:
		return "original", ToneText
	}

	return "", ToneText
}
