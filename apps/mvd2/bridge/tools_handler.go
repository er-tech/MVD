package bridge

// Tools says whether what a download needs (the downloader and the video tools) is there. On the
// first start they are fetched while the window is already open, and until they are the downloads
// cannot start.
type Tools struct {
	Ready bool `json:"ready"`
	// Message says what is going on, or what went wrong, "" when the tools are ready.
	Message string `json:"message"`
	// Failed is true when the message is about something that went wrong, not about waiting.
	Failed bool `json:"failed"`
}

// GetTools returns the state of the download tools. The page asks again while they are fetched.
func (a *App) GetTools() Tools {
	if a.host.Tools == nil {
		return Tools{Ready: true}
	}

	return a.host.Tools()
}
