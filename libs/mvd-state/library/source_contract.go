package library

// Source is one playlist, album or single song link the person added. The ID is stable for the life
// of the source, so the page keeps rows by ID and a changed row is the only one drawn again.
type Source struct {
	ID  string `json:"id"`
	URL string `json:"url"`
	// Title is the name of the playlist once it is listed, the URL until then.
	Title string `json:"title"`
	// Status is "listing", "listed" or "failed".
	Status string `json:"status"`
	Error  string `json:"error"`
	// Songs is how many songs the source has once it is listed, Done how many are saved and Failed
	// how many failed.
	Songs  int `json:"songs"`
	Done   int `json:"done"`
	Failed int `json:"failed"`
}
