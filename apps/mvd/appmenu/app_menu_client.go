// Package appmenu is the native menu of the window. Each item asks the page to do something, by
// the name of the action, and the page does it the same way as it does for a key: the menu holds no
// logic. Items carry no accelerator, because the page handles the keys and a second handler would
// do each action twice.
package appmenu

import (
	"runtime"

	"github.com/wailsapp/wails/v2/pkg/menu"
)

// Build makes the menu of the window.
//
// ask is called with the name of the action when an item is chosen: the names are the page's
// MenuAction values ("add", "open-list" and so on).
func Build(ask func(action string)) *menu.Menu {
	root := menu.NewMenu()
	if runtime.GOOS == "darwin" {
		root.Append(menu.AppMenu())
	}
	item := func(target *menu.Menu, label, action string) {
		target.AddText(label, nil, func(*menu.CallbackData) { ask(action) })
	}

	file := root.AddSubmenu("File")
	item(file, "Add music…", "add")
	file.AddSeparator()
	item(file, "New list", "new-list")
	item(file, "Open list…", "open-list")
	item(file, "Save list", "save-list")
	item(file, "Save list as…", "save-list-as")
	file.AddSeparator()
	item(file, "Preferences…", "preferences")
	if runtime.GOOS != "darwin" {
		file.AddSeparator()
		file.AddText("Quit", nil, func(*menu.CallbackData) { ask("quit") })
	}

	if runtime.GOOS == "darwin" {
		root.Append(menu.EditMenu())
	}

	run := root.AddSubmenu("Run")
	item(run, "Start", "start")
	item(run, "Pause or resume", "pause-resume")
	item(run, "Retry failed songs", "retry-failed")
	run.AddSeparator()
	item(run, "Open the songs folder", "open-folder")

	help := root.AddSubmenu("Help")
	item(help, "Keyboard shortcuts", "shortcuts")
	item(help, "About MVD", "about")

	return root
}
