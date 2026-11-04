package download

import (
	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/run/downloadsession"
)

// Controller is what a window needs from the engine.
type Controller = downloadsession.Controller

// Chooser is what a run offers when it holds each song for the person to choose.
type Chooser = downloadsession.Chooser

// SourceAdder is what a run offers when it can take more links while it works.
type SourceAdder = downloadsession.SourceAdder

// SourceRemover is what a run offers when it takes a link out while it goes on.
type SourceRemover = downloadsession.SourceRemover

// Run is one download run a host started for the app model.
type Run interface {
	Controller
	// Close stops the run, drains its events and waits for it to wind down.
	Close()
}

// RunStarter starts a download run for the chosen settings and list. The app
// model calls it when the user starts from the setup screens; an error is
// shown on the setup screen and the user stays there.
type RunStarter func(cfg config.Config, urls []string) (Run, error)
