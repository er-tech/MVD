package bridge

import "errors"

// Start downloads the songs that are ready, and each song that becomes ready later, while the
// loading goes on. It returns at once. The error says there is nothing to download or that the
// download tools are not ready.
func (a *App) Start() error {
	if err := a.toolsError(); err != nil {
		return err
	}

	return a.session.Start()
}

// toolsError is nil when the download tools are ready, and says what they are doing when not.
func (a *App) toolsError() error {
	tools := a.GetTools()
	if tools.Ready {
		return nil
	}
	if tools.Message == "" {
		return errors.New("the download tools are not ready yet")
	}

	return errors.New(tools.Message)
}

// Pause holds the downloads that have not begun. The ones going on finish.
func (a *App) Pause() {
	a.session.Pause()
}

// Resume lets the held downloads go on.
func (a *App) Resume() {
	a.session.Resume()
}

// RetryFailed queues the failed songs again and returns how many it queued.
func (a *App) RetryFailed() int {
	return a.session.RetryFailed()
}
