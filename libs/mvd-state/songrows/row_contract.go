package songrows

// Row is one song as the page shows it. The ID is stable for the life of the song, so the page keeps
// rows by ID and a changed row is the only one drawn again.
type Row struct {
	ID      string `json:"id"`
	Artist  string `json:"artist"`
	Title   string `json:"title"`
	Status  string `json:"status"`
	Percent int    `json:"percent"`
}
