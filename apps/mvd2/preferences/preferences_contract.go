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
	// AutoCookies reads the YouTube login of the browsers.
	AutoCookies bool `json:"autoCookies"`
	// CreateLogFile writes a log of the downloads.
	CreateLogFile bool `json:"createLogFile"`
}

// Options are the choices of the fields that offer a list.
type Options struct {
	VideoQualities []string `json:"videoQualities"`
	AudioQualities []string `json:"audioQualities"`
	OfficialVideos []string `json:"officialVideos"`
	// MinDownloads and MaxDownloads are the limits of Preferences.MaxDownloads.
	MinDownloads int `json:"minDownloads"`
	MaxDownloads int `json:"maxDownloads"`
}
