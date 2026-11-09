package appmenu

import (
	"runtime"
	"strings"
	"testing"

	"github.com/wailsapp/wails/v2/pkg/menu"
)

// items lists every item of the menu that has a label, with its click handler.
func items(m *menu.Menu) map[string]*menu.MenuItem {
	found := map[string]*menu.MenuItem{}
	var walk func(*menu.Menu)
	walk = func(level *menu.Menu) {
		for _, entry := range level.Items {
			if entry.SubMenu != nil {
				walk(entry.SubMenu)
			}
			label, _, _ := strings.Cut(entry.Label, "\t")
			found[label] = entry
		}
	}
	walk(m)

	return found
}

func TestEachItemAsksThePageForItsAction(t *testing.T) {
	var asked []string
	all := items(Build(func(action string) { asked = append(asked, action) }))
	want := map[string]string{
		"Add music…":            "add",
		"New list":              "new-list",
		"Open list…":            "open-list",
		"Save list":             "save-list",
		"Save list as…":         "save-list-as",
		"Preferences…":          "preferences",
		"Start":                 "start",
		"Pause or resume":       "pause-resume",
		"Retry failed songs":    "retry-failed",
		"Open the songs folder": "open-folder",
		"Keyboard shortcuts":    "shortcuts",
		"About MVD":             "about",
		"Undo":                  "undo",
		"Redo":                  "redo",
		"Cut":                   "cut",
		"Copy":                  "copy",
		"Paste":                 "paste",
		"Search songs":          "search-songs",
	}
	if runtime.GOOS == "darwin" {
		// The native Edit menu gives macOS these items, so they have no click handler of ours.
		for _, label := range []string{"Undo", "Redo", "Cut", "Copy", "Paste"} {
			delete(want, label)
		}
	}
	for label, action := range want {
		entry, found := all[label]
		if !found {
			t.Fatalf("no item %q", label)
		}
		asked = nil
		entry.Click(&menu.CallbackData{MenuItem: entry})
		if len(asked) != 1 || asked[0] != action {
			t.Fatalf("%q asked %v, want [%s]", label, asked, action)
		}
	}
}

func TestNoItemHasAnAcceleratorSoTheKeysAreNotHandledTwice(t *testing.T) {
	for label, entry := range items(Build(func(string) {})) {
		if entry.Accelerator != nil {
			t.Fatalf("%q has an accelerator", label)
		}
	}
}
