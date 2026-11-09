// Package appmenu is the native menu of the window. Each item asks the page to do something, by
// the name of the action, and the page does it the same way as it does for a key: the menu holds no
// logic. Items carry no accelerator, because the page handles the keys and a second handler would
// do each action twice. The keys are only written beside the label, after a tab, so the menu shows
// them; the Edit keys are the ones the page's own fields already handle.
package appmenu

import (
	"runtime"
	"strings"

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
	// The keys are as the page reads them (shortcut-list.content.ts); the Mac shows Cmd for Ctrl.
	item := func(target *menu.Menu, label, keys, action string) {
		if runtime.GOOS == "darwin" {
			keys = strings.ReplaceAll(keys, "Ctrl", "Cmd")
		}
		target.AddText(label+"\t"+keys, nil, func(*menu.CallbackData) { ask(action) })
	}

	file := root.AddSubmenu("File")
	item(file, "Add music…", "Ctrl+Shift+N", "add")
	file.AddSeparator()
	item(file, "New list", "Ctrl+N", "new-list")
	item(file, "Open list…", "Ctrl+O", "open-list")
	item(file, "Save list", "Ctrl+S", "save-list")
	item(file, "Save list as…", "Ctrl+Shift+S", "save-list-as")
	file.AddSeparator()
	item(file, "Open the songs folder", "Ctrl+E", "open-folder")
	file.AddSeparator()
	item(file, "Preferences…", "Ctrl+,", "preferences")
	if runtime.GOOS != "darwin" {
		file.AddSeparator()
		item(file, "Quit", "Ctrl+Q", "quit")
	}

	if runtime.GOOS == "darwin" {
		// The role menu has no submenu to add to, so the search item has a menu of its own.
		root.Append(menu.EditMenu())
		item(root.AddSubmenu("Find"), "Search songs", "Ctrl+F", "search-songs")
	} else {
		// The keys of these four work in the page's fields by themselves; the items do the same for a click.
		edit := root.AddSubmenu("Edit")
		item(edit, "Undo", "Ctrl+Z", "undo")
		item(edit, "Redo", "Ctrl+Y", "redo")
		edit.AddSeparator()
		item(edit, "Cut", "Ctrl+X", "cut")
		item(edit, "Copy", "Ctrl+C", "copy")
		item(edit, "Paste", "Ctrl+V", "paste")
		edit.AddSeparator()
		item(edit, "Search songs", "Ctrl+F", "search-songs")
	}

	run := root.AddSubmenu("Run")
	item(run, "Start", "Ctrl+Enter", "start")
	item(run, "Pause or resume", "Ctrl+Enter", "pause-resume")
	item(run, "Retry failed songs", "Ctrl+R", "retry-failed")

	help := root.AddSubmenu("Help")
	item(help, "Keyboard shortcuts", "Ctrl+K", "shortcuts")
	item(help, "About MVD", "Ctrl+M", "about")

	return root
}
