package runhost

import (
	"fmt"

	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runstate"
	"youtube-downloader/libs/mvd-core/songlist"
)

const watchURL = "https://www.youtube.com/watch?v="

// fieldsOf makes the fields of a list from pairs, leaving out the ones with no value.
func fieldsOf(pairs ...string) []Field {
	fields := []Field{}
	for i := 0; i+1 < len(pairs); i += 2 {
		if pairs[i+1] != "" {
			fields = append(fields, Field{Label: pairs[i], Value: pairs[i+1]})
		}
	}

	return fields
}

// number is a count as text, "" for zero.
func number(n int) string {
	if n == 0 {
		return ""
	}

	return fmt.Sprint(n)
}

// sourceDetail says all there is to say about a playlist.
func sourceDetail(st *runstate.State, pl *runstate.Playlist) Detail {
	row := sourceRow(st, pl)
	detail := Detail{
		Kind:   "source",
		ID:     row.ID,
		Title:  pl.Title,
		Fields: fieldsOf("Link", pl.URL, "Status", row.Status, "Songs", number(row.Songs), "Saved", number(row.Done), "Failed", number(row.Failed), "Problem", row.Error),
		Links:  []Link{{Label: "Open the playlist", URL: pl.URL}},
		Log:    append([]string{}, pl.Log...),
	}

	return detail
}

// songDetail says all there is to say about a song and gives the links to its videos: the one in
// the playlist, the official video found and the best audio found.
func songDetail(st *runstate.State, en *runstate.Entry) Detail {
	row := songRow(en)
	word, _ := songlist.StatusWord(en)
	pl := st.Playlists[st.PlaylistPos(en.Playlist)]
	detail := Detail{
		Kind:  "song",
		ID:    row.ID,
		Title: row.Title,
		Log:   append([]string{}, en.Log...),
		Links: []Link{},
	}
	detail.Fields = fieldsOf(
		"Artist", row.Artist,
		"Title", row.Title,
		"Album", en.NamedAlbum,
		"Playlist", pl.Title,
		"Position", number(en.Index),
		"Channel", en.Channel,
		"Status", word,
		"Version", row.Version,
		"Why this version", en.Reason,
		"Picture", qualityHeight(en.Height),
		"Audio", qualityAudio(en.AudioKbps),
		"Progress", progress(en),
		"Problem", row.Error,
	)
	if en.VideoID != "" {
		detail.Links = append(detail.Links, Link{Label: "Video in the playlist", URL: watchURL + en.VideoID})
	}
	if en.TargetID != "" && en.TargetID != en.VideoID {
		switch {
		case en.Official || en.OwnOfficial:
			detail.Links = append(detail.Links, Link{Label: "Official video found", URL: watchURL + en.TargetID})
		case en.Better:
			detail.Links = append(detail.Links, Link{Label: "Best audio found", URL: watchURL + en.TargetID})
		default:
			detail.Links = append(detail.Links, Link{Label: "Video chosen", URL: watchURL + en.TargetID})
		}
	}
	if en.TargetID != "" && en.TargetID == en.VideoID && (en.Official || en.OwnOfficial) {
		detail.Links[len(detail.Links)-1].Label = "Official video (the one in the playlist)"
	}

	return detail
}

func qualityHeight(height int) string {
	if height == 0 {
		return ""
	}

	return fmt.Sprintf("%dp", height)
}

func qualityAudio(kbps int) string {
	if kbps == 0 {
		return ""
	}

	return fmt.Sprintf("%d kbps", kbps)
}

// progress is the line of a download going on, "" when none is.
func progress(en *runstate.Entry) string {
	if en.State != engine.StateDownloading && en.State != engine.StateMerging {
		return ""
	}

	return runstate.ProgressLine(en)
}
