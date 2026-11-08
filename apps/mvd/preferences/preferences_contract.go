// Package preferences is the settings the person can change in the Preferences window: it reads them
// from the config file, checks a change and writes it back. The engine reads its settings from here
// each time it is built, so a change counts from the next list.
package preferences

// Preferences is what the Preferences window shows and sends back.
type Preferences struct {
	// OutputDir is the folder the songs are saved in.
	OutputDir string `json:"outputDir"`
	// VideoQuality and AudioQuality are one of Options.VideoQualities and Options.AudioQualities.
	VideoQuality string `json:"videoQuality"`
	AudioQuality string `json:"audioQuality"`
	// OutputTemplate names the files, in yt-dlp's template language.
	OutputTemplate string `json:"outputTemplate"`
	// MaxDownloads is how many songs download at the same time.
	MaxDownloads int `json:"maxDownloads"`
	// OfficialVideo is one of Options.OfficialVideos.
	OfficialVideo string `json:"officialVideo"`
	// SaveNotFound writes the songs with no official video to a file, when only official videos are
	// wanted.
	SaveNotFound bool `json:"saveNotFound"`
	// BetterAudio puts the best audio found on the official video.
	BetterAudio bool `json:"betterAudio"`
	// AutoRetry tries a failed download again later.
	AutoRetry bool `json:"autoRetry"`
	// CheckForUpdates lets the app look once a day for a newer version.
	CheckForUpdates bool `json:"checkForUpdates"`
	// CreateLogFile writes a log of the downloads.
	CreateLogFile bool `json:"createLogFile"`
	// LogDir is the folder the log is written to.
	LogDir string `json:"logDir"`
	// MergeFormat is the kind of video file made, one of Options.MergeFormats.
	MergeFormat string `json:"mergeFormat"`
	// RetryCycles is how many times a failed download is tried again before it is given up.
	RetryCycles int `json:"retryCycles"`
	// RetryWaitSeconds is the wait before the first retry, times the number of the attempt.
	RetryWaitSeconds int `json:"retryWaitSeconds"`
	// ConcurrentFragments is how many parts of a video come at once, 0 for one at a time.
	ConcurrentFragments int `json:"concurrentFragments"`
	// StartTimeoutSeconds is how long a download may take to start before it is stopped.
	StartTimeoutSeconds int `json:"startTimeoutSeconds"`
	// CookieSource is where the YouTube login comes from, one of Options.CookieSources: "off" reads
	// nothing, "all" tries each installed browser, "mvd" is the sign-in made inside the app, and any
	// other is the browser of that name.
	CookieSource string `json:"cookieSource"`
}

// Options are the choices of the fields that offer a list.
type Options struct {
	VideoQualities []string `json:"videoQualities"`
	AudioQualities []string `json:"audioQualities"`
	OfficialVideos []string `json:"officialVideos"`
	// MinDownloads and MaxDownloads are the limits of Preferences.MaxDownloads.
	MinDownloads int `json:"minDownloads"`
	MaxDownloads int `json:"maxDownloads"`
	// MergeFormats are the kinds of video file the app can make.
	MergeFormats []string `json:"mergeFormats"`
	// CookieSources are the places the YouTube login can come from, in the order they are shown.
	CookieSources []string `json:"cookieSources"`
	// CanSignIn, CanMove and CanUninstall say which actions this system offers.
	CanSignIn    bool `json:"canSignIn"`
	CanMove      bool `json:"canMove"`
	CanUninstall bool `json:"canUninstall"`
}
