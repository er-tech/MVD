package workspace

import "youtube-downloader/libs/mvd-core/menumodel"

// screenKey is a key of the download screen that no menu lists, and what it does.
type screenKey struct{ keys, does string }

// downloadKeys are the keys of the screen that shows a run, as its own help lists them.
var downloadKeys = []screenKey{
	{"↑ ↓  j k", "Move the selection, scroll the output"},
	{"Tab", "Move between the lists, the songs and the output"},
	{"Enter", "Follow the download that is running"},
	{"Space", "Tick or untick the song"},
	{"D", "Accept the songs that are ticked (or all, with a capital)"},
	{"X", "Reject the songs that are ticked"},
	{"O", "Open the video of the song"},
	{"S", "Swap the video of the song for another"},
	{"C", "Choose the columns, and their order"},
	{"Shift+F", "Choose which statuses to show"},
	{"F", "Show only the songs that failed"},
	{"R", "Retry the failed song, or all of a list"},
	{"L", "Show the output on the whole screen"},
	{"?", "Help for this screen"},
}

// shortcutSection is a heading of the Keyboard shortcuts window and its keys.
type shortcutSection struct {
	heading string
	keys    []screenKey
}

// shortcutSections are what the Keyboard shortcuts window lists: every shortcut of every menu,
// read from the menus themselves so the window cannot say anything the menus do not, then the
// keys of the download screen. Two entries that share a key (Download and Pause downloads) are said once.
func shortcutSections() []shortcutSection {
	var sections []shortcutSection
	for _, menu := range menus() {
		var keys []screenKey
		at := map[string]int{}
		for _, e := range menu.Entries {
			if e.Separator || e.Shortcut == "" {
				continue
			}
			label := menumodel.ShortcutLabel(e.Shortcut)
			if i, ok := at[label]; ok {
				keys[i].does += " / " + e.Name
				continue
			}
			at[label] = len(keys)
			keys = append(keys, screenKey{label, e.Name})
		}
		if len(keys) > 0 {
			sections = append(sections, shortcutSection{menu.Name, keys})
		}
	}

	return append(sections, shortcutSection{"While downloading", downloadKeys})
}
