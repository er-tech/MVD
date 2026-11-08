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
	maxDownloads = 16
)

// OptionsOf is the choices the window offers.
func OptionsOf() Options {
	return Options{
		VideoQualities: config.VideoPresets,
		AudioQualities: config.AudioPresets,
		OfficialVideos: config.OfficialModes,
		MinDownloads:   minDownloads,
		MaxDownloads:   maxDownloads,
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
		AutoCookies:     cfg.AutoCookies,
		CreateLogFile:   cfg.CreateLogFile,
	}
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
	cfg.AutoCookies = p.AutoCookies
	cfg.CreateLogFile = p.CreateLogFile

	return cfg, nil
}
