package library

// Song is one song of a source, as the page shows it in the table.
type Song struct {
	ID       string `json:"id"`
	SourceID string `json:"sourceId"`
	// Position is the place of the song in its source, from 1.
	Position int    `json:"position"`
	Artist   string `json:"artist"`
	Title    string `json:"title"`
	// Status is the word that says where the song is ("waiting", "finding", "official found"...)
	// and Tone how to colour it: "dim", "focus", "highlight", "success" or "error".
	Status string `json:"status"`
	Tone   string `json:"tone"`
	// Percent and Speed (bytes a second) describe the download going on, 0 when none is.
	Percent int `json:"percent"`
	Speed   int `json:"speed"`
	// Version says which video the song takes: "official", "better", "original" or "" when not known.
	Version string `json:"version"`
	// Height is the picture height and AudioKbps the audio rate of the version, 0 when not known.
	Height    int    `json:"height"`
	AudioKbps int    `json:"audioKbps"`
	Error     string `json:"error"`
}
