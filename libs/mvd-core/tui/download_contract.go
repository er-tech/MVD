package tui

import downloadpage "youtube-downloader/libs/mvd-core/run/download"

// Controller is what the download screen needs from the engine.
type Controller = downloadpage.Controller

// Run is one download run a host started for the app model.
type Run = downloadpage.Run

// RunStarter starts a download run for the chosen settings and list.
type RunStarter = downloadpage.RunStarter

// SourceAdder is what a run offers when it can take more links while it works.
type SourceAdder = downloadpage.SourceAdder
