package terminalui

import (
	"os"
	"strings"
)

// loadLastList reads the file of the list that was open when the app last ran. known is false when
// none was ever kept, and path is "" when that list had no file.
func loadLastList(file string) (path string, known bool) {
	data, err := os.ReadFile(file)
	if err != nil {
		return "", false
	}

	return strings.TrimSpace(string(data)), true
}

// saveLastList keeps the file of the open list, "" for a list with none, for the next start.
func saveLastList(file, path string) error {
	return os.WriteFile(file, []byte(path), 0o644)
}
