//go:build darwin

package childprocs

// Contain does nothing on this system. The programs the engine starts stop with their parent here:
// the engine ends yt-dlp when its context ends, and ffmpeg then reads a closed pipe and ends too.
func Contain() error { return nil }
