//go:build !windows

package signin

import "errors"

// Flag is the command line flag that makes the program show the sign-in window and nothing else.
// Only Windows has the window, so nothing starts the program with it elsewhere.
const Flag = "youtube-sign-in"

// RunWindow tells that the sign-in window is only offered on Windows, where yt-dlp can read its cookies.
// The program is never started with Flag on another system, so this is not reached in use.
func RunWindow(string) error {
	return errors.New("signing in inside MVD is only offered on Windows")
}
