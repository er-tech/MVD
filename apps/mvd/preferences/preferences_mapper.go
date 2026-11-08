package preferences

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"youtube-downloader/libs/mvd-core/config"
)

const (
	minDownloads = 1
	maxDownloads = 32
)

var (
	mergeFormats  = []string{"mp4", "mkv", "webm"}
	cookieSources = []string{"off", "mvd", "firefox", "chrome", "edge", "brave", "chromium", "opera", "vivaldi", "safari", "all"}
)

// OptionsOf is the choices the window offers.
func OptionsOf() Options {
	return Options{
		VideoQualities: config.VideoPresets,
		AudioQualities: config.AudioPresets,
		OfficialVideos: config.OfficialModes,
		MinDownloads:   minDownloads,
		MaxDownloads:   maxDownloads,
		MergeFormats:   mergeFormats,
		CookieSources:  cookieSources,
	}
}

// fromConfig reads the preferences out of the settings.
func fromConfig(cfg config.Config) Preferences {
	return Preferences{
		OutputDir:       cfg.OutputDir,
		VideoQuality:    cfg.VideoQuality,
		AudioQuality:    cfg.AudioQuality,
		OutputTemplate:  cfg.OutputTemplate,
		MaxDownloads:    cfg.MaxConcurrentDownloads,
		OfficialVideo:   string(cfg.OfficialVideo),
		SaveNotFound:    cfg.SaveNotFound,
		BetterAudio:     cfg.BetterAudio,
		AutoRetry:       cfg.AutoRetry,
		CheckForUpdates: cfg.CheckForUpdates,
		CreateLogFile:   cfg.CreateLogFile,

		LogDir:              cfg.LogDir,
		MergeFormat:         cfg.MergeOutputFormat,
		RetryCycles:         cfg.RetryCycles,
		RetryWaitSeconds:    cfg.RetryWaitSeconds,
		ConcurrentFragments: cfg.ConcurrentFragments,
		StartTimeoutSeconds: cfg.StartTimeoutSeconds,
		CookieSource:        cookieSourceOf(cfg),
	}
}

// cookieSourceOf is where the settings say the YouTube login comes from.
func cookieSourceOf(cfg config.Config) string {
	switch {
	case cfg.CookiesFromBrowser != "":
		return cfg.CookiesFromBrowser
	case cfg.AutoCookies:
		return "all"
	}

	return "off"
}

// applyTo returns the settings with the preferences put in. It returns an error that says which
// field is wrong, and the settings unchanged, when a value is not allowed.
func applyTo(cfg config.Config, p Preferences) (config.Config, error) {
	switch {
	case strings.TrimSpace(p.OutputDir) == "":
		return cfg, errors.New("choose the folder to save the songs in")
	case !slices.Contains(config.VideoPresets, p.VideoQuality):
		return cfg, fmt.Errorf("%q is not a video quality", p.VideoQuality)
	case !slices.Contains(config.AudioPresets, p.AudioQuality):
		return cfg, fmt.Errorf("%q is not an audio quality", p.AudioQuality)
	case !slices.Contains(config.OfficialModes, p.OfficialVideo):
		return cfg, fmt.Errorf("%q is not a way to treat official videos", p.OfficialVideo)
	case p.MaxDownloads < minDownloads || p.MaxDownloads > maxDownloads:
		return cfg, fmt.Errorf("downloads at the same time must be from %d to %d", minDownloads, maxDownloads)
	case strings.TrimSpace(p.OutputTemplate) == "":
		return cfg, errors.New("the name of the files cannot be empty")
	case !slices.Contains(mergeFormats, p.MergeFormat):
		return cfg, fmt.Errorf("%q is not a kind of video file", p.MergeFormat)
	case p.RetryCycles < 1 || p.RetryCycles > 999:
		return cfg, errors.New("retry attempts must be from 1 to 999")
	case p.RetryWaitSeconds < 1 || p.RetryWaitSeconds > 3600:
		return cfg, errors.New("the wait before retrying must be from 1 to 3600 seconds")
	case p.ConcurrentFragments < 0 || p.ConcurrentFragments > 16:
		return cfg, errors.New("parts downloaded at once must be from 0 to 16")
	case p.StartTimeoutSeconds < 10 || p.StartTimeoutSeconds > 3600:
		return cfg, errors.New("the wait for a slow start must be from 10 to 3600 seconds")
	case !slices.Contains(cookieSources, p.CookieSource):
		return cfg, fmt.Errorf("%q is not a place to take the YouTube login from", p.CookieSource)
	case p.CreateLogFile && strings.TrimSpace(p.LogDir) == "":
		return cfg, errors.New("choose the folder to write the log in")
	}
	cfg.OutputDir = strings.TrimSpace(p.OutputDir)
	cfg.VideoQuality = p.VideoQuality
	cfg.AudioQuality = p.AudioQuality
	cfg.OutputTemplate = strings.TrimSpace(p.OutputTemplate)
	cfg.MaxConcurrentDownloads = p.MaxDownloads
	cfg.OfficialVideo = config.OfficialMode(p.OfficialVideo)
	cfg.SaveNotFound = p.SaveNotFound
	cfg.BetterAudio = p.BetterAudio
	cfg.AutoRetry = p.AutoRetry
	cfg.CheckForUpdates = p.CheckForUpdates
	cfg.CreateLogFile = p.CreateLogFile
	if dir := strings.TrimSpace(p.LogDir); dir != "" {
		cfg.LogDir = dir
	}
	cfg.MergeOutputFormat = p.MergeFormat
	cfg.RetryCycles = p.RetryCycles
	cfg.RetryWaitSeconds = p.RetryWaitSeconds
	cfg.ConcurrentFragments = p.ConcurrentFragments
	cfg.StartTimeoutSeconds = p.StartTimeoutSeconds
	switch p.CookieSource {
	case "all":
		cfg.AutoCookies, cfg.CookiesFromBrowser = true, ""
	case "off":
		cfg.AutoCookies, cfg.CookiesFromBrowser = false, ""
	default:
		cfg.AutoCookies, cfg.CookiesFromBrowser = false, p.CookieSource
	}

	return cfg, nil
}
