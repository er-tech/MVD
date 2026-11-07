package appwindow

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"youtube-downloader/libs/mvd-core/prefsform"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// The events of the classic themed window: the style and what the window shows go to the page,
// and what the person does comes back. The page asks for the style when it starts, as it may
// start after the program told it.
const (
	styleEvent        = "mvd:style"
	styleRequestEvent = "mvd:style-request"
	snapshotEvent     = "mvd:snapshot"
	intentEvent       = "mvd:intent"
	prefsEvent        = "mvd:prefs"
	prefsIntentEvent  = "mvd:prefs-intent"
	dialogCloseEvent  = "mvd:dialog-close"
)

// ClassicWindow carries the windows the page draws between the program and the page: the window
// style chosen in the preferences, what the classic window shows, the preferences while they are
// open (in every style), each as JSON sent only when it changed, and the intents the page sends
// back. It is made before the window and works once the window is up; before that, what it is told
// is kept and sent when the page asks.
type ClassicWindow struct {
	// OnIntent is given each intent of the main window the page sends, and OnPrefsIntent each one
	// of the preferences; nil drops them.
	OnIntent      func(windowsnapshot.Intent)
	OnPrefsIntent func(prefsform.WindowIntent)

	mu       sync.Mutex
	app      *application.App
	style    string // the style and its scheme, as the JSON the page reads
	snapshot string
	prefs    string
	// pacer holds the snapshots back to the pace the page can draw them at.
	pacer *snapshotPacer
	// window is the window of the preferences, once there is one to open.
	window *childWindow
	// dialog is the window of a dialog (adding music, a question or a note), once there is one to open.
	dialog *childWindow
}

// attach starts listening to the page, and returns how to stop.
func (w *ClassicWindow) attach(app *application.App, window, dialog *childWindow) func() {
	w.mu.Lock()
	w.app = app
	w.window = window
	w.dialog = dialog
	w.mu.Unlock()
	stopIntents := app.Event.On(intentEvent, func(event *application.CustomEvent) {
		text, ok := event.Data.(string)
		var in windowsnapshot.Intent
		if ok && w.OnIntent != nil && json.Unmarshal([]byte(text), &in) == nil {
			w.OnIntent(in)
		}
	})
	stopPrefsIntents := app.Event.On(prefsIntentEvent, func(event *application.CustomEvent) {
		text, ok := event.Data.(string)
		var in prefsform.WindowIntent
		if ok && w.OnPrefsIntent != nil && json.Unmarshal([]byte(text), &in) == nil {
			w.OnPrefsIntent(in)
		}
	})
	stopRequests := app.Event.On(styleRequestEvent, func(*application.CustomEvent) { w.resend() })

	return func() {
		stopIntents()
		stopPrefsIntents()
		stopRequests()
	}
}

// SetStyle says which window style the settings have, and its colour scheme.
func (w *ClassicWindow) SetStyle(style, scheme string) {
	data, err := json.Marshal(map[string]string{"style": style, "scheme": scheme})
	if err != nil {
		return
	}
	w.mu.Lock()
	w.style = string(data)
	app := w.app
	w.mu.Unlock()
	if app != nil {
		app.Event.Emit(styleEvent, string(data))
	}
}

// snapshotInterval is the least time between two snapshots sent to the page: the page draws each
// one whole, so a long list that changes at every event would keep it busy for good.
const snapshotInterval = 200 * time.Millisecond

// Show says what the window shows; the page is told only when it changed, and at most a few times
// a second, with the newest state each time. A dialog (the window for adding music, a question or
// a note) is not drawn in this window: the window of its own opens with it and closes when it goes.
func (w *ClassicWindow) Show(snap windowsnapshot.Snapshot) {
	data, err := json.Marshal(snap)
	if err != nil {
		return
	}
	w.mu.Lock()
	w.snapshot = string(data)
	if w.pacer == nil {
		w.pacer = &snapshotPacer{every: snapshotInterval, send: w.emitSnapshot}
	}
	pacer, dialog := w.pacer, w.dialog
	w.mu.Unlock()
	pacer.offer(string(data))
	if dialog != nil {
		dialog.set(snap.Adding != nil || snap.Question != nil)
	}
}

// emitSnapshot tells the page a snapshot, once there is a page to tell.
func (w *ClassicWindow) emitSnapshot(snapshot string) {
	w.mu.Lock()
	app := w.app
	w.mu.Unlock()
	if app != nil {
		app.Event.Emit(snapshotEvent, snapshot)
	}
}

// ShowPreferences says what the preferences window shows, or nil once it is closed; the page is
// told only when it changed. The window opens with the first and closes with the nil.
func (w *ClassicWindow) ShowPreferences(prefs *prefsform.Window) {
	data, err := json.Marshal(prefs)
	if err != nil {
		return
	}
	w.mu.Lock()
	changed := string(data) != w.prefs
	w.prefs = string(data)
	app, window := w.app, w.window
	w.mu.Unlock()
	if changed && app != nil {
		app.Event.Emit(prefsEvent, string(data))
	}
	if window != nil {
		window.set(prefs != nil)
	}
}

// resend tells the page the style and the last snapshot again, for a page that has just started.
func (w *ClassicWindow) resend() {
	w.mu.Lock()
	app, style, snapshot, prefs, pacer := w.app, w.style, w.snapshot, w.prefs, w.pacer
	w.mu.Unlock()
	if app == nil || style == "" {
		return
	}
	app.Event.Emit(styleEvent, style)
	if snapshot != "" {
		if pacer != nil {
			pacer.resent(snapshot)
		}
		app.Event.Emit(snapshotEvent, snapshot)
	}
	if prefs != "" {
		app.Event.Emit(prefsEvent, prefs)
	}
}
