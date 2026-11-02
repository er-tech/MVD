package runner

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"youtube-downloader/libs/mvd-core/appdir"
	"youtube-downloader/libs/mvd-core/audiofix"
	"youtube-downloader/libs/mvd-core/musicfixer"
	"youtube-downloader/libs/mvd-core/ytdlp/fetch"
)

// betterAudio is what runs on every official video that was downloaded, when the setting Best
// Audio On The Video is on: the best sound of the song is fetched and music-fixer recreates the
// video with it, lined up with the picture. The new video takes the place of the downloaded one
// only when everything worked; otherwise the downloaded video stays as it is. When this build
// has no music-fixer or the system has no ffmpeg, nothing is tried and each video says why, so
// the song is not delayed for nothing and the setting is not silent.
func betterAudio(ytDlpPath string, extraArgs []string) func(ctx context.Context, videoID string, files []string, log func(string, ...any)) error {
	dir, err := appdir.Dir()
	if err != nil {
		return notDone("the app folder is not available")
	}
	exe, err := musicfixer.Install(dir)
	if errors.Is(err, musicfixer.ErrNotBundled) {
		return notDone("this build of MVD has no music-fixer")
	}
	if err != nil {
		return notDone(fmt.Sprintf("music-fixer could not be set up (%v)", err))
	}
	ffmpeg := audiofix.FFmpegFor(ytDlpPath)
	if ffmpeg == "" {
		return notDone("ffmpeg was not found")
	}
	return func(ctx context.Context, videoID string, files []string, log func(string, ...any)) error {
		video := videoOf(files)
		if video == "" {
			return nil
		}
		work, err := os.MkdirTemp("", "mvd-better-audio-*")
		if err != nil {
			return err
		}
		defer func() { _ = os.RemoveAll(work) }()

		log("[better audio] fetching the best sound of the song")
		music := filepath.Join(work, "music.%(ext)s")
		args := fetch.DownloadArgs(fetch.DownloadOptions{Format: "bestaudio", OutputTemplate: music, ExtraArgs: extraArgs},
			"--no-playlist", "https://www.youtube.com/watch?v="+videoID)
		if err := fetch.Download(ctx, ytDlpPath, args, func(string) {}); err != nil {
			return fmt.Errorf("could not fetch the best sound: %w", err)
		}
		sound, _ := filepath.Glob(filepath.Join(work, "music.*"))
		if len(sound) == 0 {
			return fmt.Errorf("could not fetch the best sound")
		}

		log("[better audio] recreating the video with it")
		res, err := musicfixer.Fix(ctx, musicfixer.Job{Exe: exe, Video: video, Music: sound[0], OutDir: filepath.Join(work, "out"), FFmpeg: ffmpeg}, nil)
		if err != nil {
			return err
		}
		target := strings.TrimSuffix(video, filepath.Ext(video)) + filepath.Ext(res.Better)
		if err := os.Rename(res.Better, target); err != nil {
			return fmt.Errorf("could not put the new video in place: %w", err)
		}
		if target != video {
			_ = os.Remove(video)
		}
		log("[better audio] done (the sound was moved %d ms)", res.OffsetMs)
		return nil
	}
}

// notDone is the step used when the best audio cannot be put on a video: it only says why, and
// the downloaded video stays as it is.
func notDone(reason string) func(ctx context.Context, videoID string, files []string, log func(string, ...any)) error {
	return func(_ context.Context, _ string, _ []string, log func(string, ...any)) error {
		log("[better audio] not done: %s; the video stays as it was downloaded", reason)

		return nil
	}
}

// videoOf is the video among the files a download made.
func videoOf(files []string) string {
	for _, f := range files {
		switch strings.ToLower(filepath.Ext(f)) {
		case ".mp4", ".mkv", ".webm", ".mov":
			return f
		}
	}
	return ""
}
