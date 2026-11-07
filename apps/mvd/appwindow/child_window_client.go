package appwindow

import (
	"sync"
	"sync/atomic"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// childSpec says which window a childWindow is: its name and title, its page (the same page as
// MVD's window, which shows only that window when it is told so; see the page's main.tsx), its size
// and the smallest it can be made.
type childSpec struct {
	name, title, url string
	width, height    int
	minWidth         int
	minHeight        int
}

// preferencesSpec is the window of the preferences.
var preferencesSpec = childSpec{
	name: "preferences", title: "MVD Preferences", url: "/?window=preferences",
	width: 820, height: 680, minWidth: 520, minHeight: 380,
}

// dialogSpec is the window of a dialog (the window for adding music, a question or a note). The
// page sets its height to fit the dialog.
var dialogSpec = childSpec{
	name: "dialog", title: "MVD", url: "/?window=dialog",
	width: 520, height: 320, minWidth: 520, minHeight: 120,
}

// childWindow is a window of its own that opens over MVD's window: the preferences, or a dialog.
// The program says when it is open (see ClassicWindow.ShowPreferences and ClassicWindow.Show); the
// person can also close the window with the system's own means, which is told to the program as
// the close button of the page would be.
type childWindow struct {
	spec childSpec
	app  *application.App
	// main is MVD's window, which this one opens over and which sends the focus here.
	main *application.WebviewWindow
	// onClose is told when the person closes the window; the program then decides.
	onClose func()

	mu        sync.Mutex
	window    *application.WebviewWindow
	byProgram *atomic.Bool // the program is closing this window, so it closes without asking
}

// set opens the window when the program has its page open and closes it when it has not.
// It is called after every change of the program, so it leaves an open window as it is: focusing it
// again each time made the window lose and gain the focus several times a second.
func (p *childWindow) set(open bool) {
	// The window's own calls wait for the system's thread, which may be waiting for focus() here
	// (MVD's window gets the focus back when this one closes), so the lock is never held across them.
	p.mu.Lock()
	window, byProgram := p.window, p.byProgram
	if !open {
		p.window, p.byProgram = nil, nil
	}
	p.mu.Unlock()

	switch {
	case open && window == nil:
		window, byProgram = p.create()
		p.mu.Lock()
		p.window, p.byProgram = window, byProgram
		p.mu.Unlock()
	case window != nil && !open:
		byProgram.Store(true)
		window.Close()
	}
}

// focus brings the window to the front, when it is open: MVD's window cannot be used while this
// one is open, so a click on it leads back here.
func (p *childWindow) focus() {
	p.mu.Lock()
	window := p.window
	p.mu.Unlock()
	if window != nil {
		window.Focus()
	}
}

// create opens the window, in the middle of MVD's window.
func (p *childWindow) create() (*application.WebviewWindow, *atomic.Bool) {
	x, y := 0, 0
	if p.main != nil {
		left, top := p.main.Position()
		width, height := p.main.Size()
		x = max(left+(width-p.spec.width)/2, 0)
		y = max(top+(height-p.spec.height)/2, 0)
	}
	window := p.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:      p.spec.name,
		Title:     p.spec.title,
		Width:     p.spec.width,
		Height:    p.spec.height,
		MinWidth:  p.spec.minWidth,
		MinHeight: p.spec.minHeight,
		// The page draws the title bar, in the style of the window, as MVD's window does.
		Frameless:        true,
		BackgroundColour: application.NewRGB(0, 0, 0),
		URL:              p.spec.url,
		InitialPosition:  application.WindowXY,
		X:                x,
		Y:                y,
	})
	byProgram := &atomic.Bool{}
	window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if byProgram.Load() {
			return
		}
		event.Cancel() // the program decides, and closes the window when it has closed its page
		if p.onClose != nil {
			p.onClose()
		}
	})
	window.Focus()

	return window, byProgram
}
