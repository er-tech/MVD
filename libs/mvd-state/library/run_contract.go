package library

// Run is the state of the run as the footer and the toolbar show it.
type Run struct {
	// Phase is "empty" (nothing added), "loading" (finding the songs), "ready" (loaded, waiting for
	// Start), "downloading" or "finished".
	Phase string `json:"phase"`
	// Started is true once the person pressed Start. Paused is true while the downloads are held.
	Started bool `json:"started"`
	Paused  bool `json:"paused"`
	// Sources and Songs count what is listed. Done, Failed and Active count the songs saved, failed
	// and being worked on.
	Sources int `json:"sources"`
	Songs   int `json:"songs"`
	Done    int `json:"done"`
	Failed  int `json:"failed"`
	Active  int `json:"active"`
	// Speed is the bytes a second of all the downloads together.
	Speed int `json:"speed"`
}
