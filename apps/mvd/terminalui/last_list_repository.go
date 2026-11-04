package terminalui

import (
	"os"
	"strings"
)

// loadKeptPath reads a path kept for the next start: the file of the list that was open, or the
// folder the file windows last used. known is false when none was ever kept, and path is "" when
// what was kept had none.
func loadKeptPath(file string) (path string, known bool) {
	data, err := os.ReadFile(file)
	if err != nil {
		return "", false
	}

	return strings.TrimSpace(string(data)), true
}

// saveKeptPath keeps path, "" for none, for the next start.
func saveKeptPath(file, path string) error {
	return os.WriteFile(file, []byte(path), 0o644)
}
