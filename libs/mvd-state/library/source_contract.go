package library

// Source is one playlist, album or single song link the person added. The ID is stable for the life
// of the source, so the page keeps rows by ID and a changed row is the only one drawn again.
type Source struct {
	ID  string `json:"id"`
	URL string `json:"url"`
	// Position is the place of the source in the list, from 1. The store sets it: a writer leaves it 0.
	Position int `json:"position"`
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
	// Finding is how many songs of the source are being looked up now, for a spinner.
	Finding int `json:"finding"`
}
