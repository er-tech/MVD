package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"youtube-downloader/libs/mvd-core/program"
	"youtube-downloader/libs/mvd-core/workspace/addsource"
	"youtube-downloader/libs/mvd-core/workspace/closequestion"
	"youtube-downloader/libs/mvd-core/workspace/linequestion"
	"youtube-downloader/libs/mvd-core/workspace/listhistory"
	"youtube-downloader/libs/mvd-core/workspace/runcontrol"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/playlistfile"
	"youtube-downloader/libs/mvd-core/run/downloadsession"
)

type (
	// runStartedMsg carries the run the host built, or why it could not.
	runStartedMsg struct {
		run    ListRun
		err    error
		review bool
	}
	// runClosedMsg says a run finished winding down.
	runClosedMsg struct{ quit bool }
	// filePickedMsg is what the operating system's file window answered.
	filePickedMsg struct {
		purpose purpose
		path    string
		chosen  bool
		err     error
	}
	// updateCheckedMsg carries the line the check for a newer version left to show.
	updateCheckedMsg struct{ line string }
	// entryChosenMsg is a menu entry chosen once the run has wound down.
	entryChosenMsg struct{ name string }
	// saveTickMsg is the beat at which the list is brought up to date with the run.
	saveTickMsg time.Time
	// toolsTickMsg is the beat at which the state of the tools is looked at again, while they
	// are being fetched.
	toolsTickMsg time.Time
)

// PreferencesRequestedMsg asks the host to show the preferences; it gives the result back
// with Reconfigure.
type PreferencesRequestedMsg struct{}

// OpenListMsg asks the workspace to open the list at Path, as when a .mvd file is double
// clicked while the app is already open.
type OpenListMsg struct{ Path string }

// saveEvery is how often the list file is brought up to date while a run goes on.
const saveEvery = 2 * time.Second

// purpose is what the one-line question at the bottom is asking for.
type purpose int

const (
	askNone purpose = iota
	askOpen
	askSaveAs
	askSaveThenStart
	askSaveThenReview
	askAddLink
	askChangeLink
)

// Model is the workspace.
type Model struct {
	host    Host
	cfg     config.Config
	session *downloadlist.Session

	// disabled are the menu entries that cannot be chosen now, by name.
	disabled map[string]bool
	// dl is what the window shows and does, and events are what the run attached to it reports.
	dl     downloadsession.Session
	events <-chan interface{}

	run ListRun
	// life is whether the run is being started or wound down, and what waits for that.
	life runcontrol.Lifecycle
	// loadedKey is the list of addresses the last run was started on (or taken in), so a list is
	// loaded in the background only when it has changed since.
	loadedKey string

	about bool
	// add is the window for adding music, when addOpen.
	add     addsource.State
	addOpen bool
	// closing is the question asked before the app closes while songs download.
	closing closequestion.State
	// shortcuts is whether the Keyboard shortcuts window is showing, and shortcutsScroll how far
	// down its lines it is.
	shortcuts       bool
	shortcutsScroll int
	// inline is the address being written, as a question of the window.
	inline inlineEdit

	// history is the lists as they were before the changes made to it, for undo and redo.
	history listhistory.History
	// changing is the playlist whose address the question at the bottom is asking for.
	changing int

	// asking is what the question of the window asks for, askPrompt what it says and askText what
	// was written.
	asking             purpose
	askPrompt, askText string

	notice string
	// done is what an action that worked says, and caution what it warns of; both go away at the
	// next key or click, while an error stays until something replaces it.
	done, caution string
	// wasFinished is whether the run had finished when the screen was last drawn.
	wasFinished   bool
	width, height int
	// lastDir is the folder the file windows start in, from the last list opened or saved.
	lastDir string
}

// New returns the workspace showing list, which may be nil for a new, empty one.
func New(host Host, cfg config.Config, list *downloadlist.Session) Model {
	if list == nil {
		list = downloadlist.New(nil)
	}
	m := Model{host: host, cfg: cfg, session: list, dl: downloadsession.NewHosted(), lastDir: host.LastDir}
	m.dl.Show(list.Preview())
	return m
}

// Session is the list that is open.
func (m Model) Session() *downloadlist.Session { return m.session }

// Init returns the tick that checks the tools.
func (m Model) Init() program.Cmd { return m.toolsTick() }

func (m Model) running() bool { return m.run != nil }

// sourcesKey is the addresses of the list, as one text that changes when the list does.
func (m Model) sourcesKey() string { return strings.Join(m.session.Sources(), "\n") }

// wantsLoading says whether the songs of the list are to be loaded now, in the background: the list
// has addresses nobody has loaded, nothing is being written or asked, and the tools are there.
func (m Model) wantsLoading() bool {
	if !m.host.AutoLoad || m.host.Start == nil || m.running() || m.life.Busy() {
		return false
	}
	if m.inline.on || m.asking != askNone || m.about || m.shortcuts || len(m.session.Sources()) == 0 {
		return false
	}
	if _, waiting := m.toolsWaiting(); waiting {
		return false
	}

	return m.sourcesKey() != m.loadedKey
}

// facts are what the run is doing, for the decisions of package runcontrol.
func (m Model) facts() runcontrol.Facts {
	f := runcontrol.Facts{HasRun: m.run != nil, Starting: m.life.Starting, Stopping: m.life.Stopping}
	if m.run != nil {
		f.Paused = m.run.Paused()
		_, f.CanAddLinks = m.run.(downloadsession.SourceAdder)
	}
	if state := m.dl.State; state != nil {
		f.Idle, f.AllListed, f.Tally = state.Idle, state.AllListed(), state.Tally()
	}

	return f
}

// addable says whether links can be added to the run that is going on.
func (m Model) addable() bool { return m.facts().Addable() }

// addToRun gives the run more links, and keeps them in the list.
func (m Model) addToRun(links []string) Model {
	adder, ok := m.run.(downloadsession.SourceAdder)
	if !ok || len(links) == 0 {
		return m
	}
	m.session.SetSources(append(m.session.Sources(), links...))
	for _, link := range links {
		adder.AddSource(link)
	}
	m.loadedKey = m.sourcesKey()
	m.syncFile()
	m.done = runcontrol.AddedNotice(len(links))

	return m
}

// Update handles msg and returns the next model and its command. It also clears notices when a run ends, quits when nothing is left to lose, and loads songs.
func (m Model) Update(msg program.Msg) (program.Model, program.Cmd) {
	next, cmd := m.update(msg)
	if ws, ok := next.(Model); ok {
		// When a run ends, what was said while it began (a draft was kept...) gives way to how it went.
		if finished := ws.finished(); finished != ws.wasFinished {
			ws.wasFinished = finished
			if finished {
				ws.done, ws.caution = "", ""
			}
		}
		// The question is about songs that would be lost: once none is left, there is nothing to ask.
		if ws.closing.On && ws.downloading() == 0 {
			var quit program.Cmd
			ws, quit = ws.quitNow()
			cmd = program.Batch(cmd, quit)
		}
		if ws.wantsLoading() {
			var load program.Cmd
			ws, load = ws.start(true)
			cmd = program.Batch(cmd, load)
		}
		next = ws.refreshMenus()
	}
	return next, cmd
}

func (m Model) update(msg program.Msg) (program.Model, program.Cmd) {
	if _, ok := msg.(WindowIntentMsg); ok {
		m.done, m.caution, m.notice = "", "", ""
	}
	switch msg := msg.(type) {
	case program.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil

	case entryChosenMsg:
		return m.choose(msg.name)

	case WindowIntentMsg:
		return m.windowIntent(windowsnapshot.Intent(msg))

	case runStartedMsg:
		return m.runStarted(msg)

	case runClosedMsg:
		left := m.dl.State.Tally()
		m.run = nil
		m.detach()
		m.dl.Show(m.session.Preview())
		if unfinished := left.Queued + left.Running; unfinished > 0 && !msg.quit {
			m.done = fmt.Sprintf("Stopped: %d saved, %d not downloaded. Load the playlists again to carry on.", left.Done, unfinished)
		}
		if msg.quit {
			return m, m.quit()
		}
		if next := m.life.Closed(); next != nil {
			return m.Update(next)
		}
		return m, nil

	case listEdit:
		return m.editList(msg)

	case evMsg:
		return m.runEvents(msg)

	case evClosed:
		return m.runEventsEnded(msg), nil

	case toolsTickMsg:
		return m, m.toolsTick()
	case saveTickMsg:
		if m.run == nil {
			return m, nil
		}
		m.syncList()
		return m, saveTick()

	case OpenListMsg:
		m = m.settle()
		if m.life.Busy() {
			m.notice = "One moment..."
			return m, nil
		}
		if m.running() {
			if m.holdsOnlyTheList() {
				return m.stopThen(msg)
			}
			m.notice = "Stop the downloads before opening " + filepath.Base(msg.Path)
			return m, nil
		}
		m.asking = askNone
		return m.answered(askOpen, msg.Path)

	case updateCheckedMsg:
		if msg.line != "" {
			m.notice = msg.line
		}
		return m, nil

	case filePickedMsg:
		if msg.err != nil {
			m.notice = "Cannot show the file window: " + msg.err.Error()
			return m, nil
		}
		if !msg.chosen {
			return m, nil
		}
		return m.answered(msg.purpose, msg.path)

	case CloseRequestedMsg:
		return m.closeRequested()
	}

	return m, nil
}

// choose does what a menu entry says.
func (m Model) choose(name string) (program.Model, program.Cmd) {
	if m.life.Busy() {
		return m, nil
	}
	if settles(name) {
		m = m.settle() // a run that has finished is over: nothing has to be stopped
	}
	if next, cmd, handled := m.runChoice(name); handled {
		return next, cmd
	}
	switch name {
	case entryNew:
		m = m.stopInline(false)
		if m.running() {
			if m.holdsOnlyTheList() {
				return m.stopThen(entryChosenMsg{name})
			}
			m.notice = "Stop the downloads before starting a new list"
			return m, nil
		}
		kept := m.session.Path()
		m.session = downloadlist.New(nil)
		m.dl.Show(m.session.Preview())
		m.notice = ""
		if kept != "" {
			m.done = "New list. " + filepath.Base(kept) + " is kept: File > Open brings it back"
		}
	case entryOpen:
		if m.running() {
			if m.holdsOnlyTheList() {
				return m.stopThen(entryChosenMsg{name})
			}
			m.notice = "Stop the downloads before opening another list"
			return m, nil
		}
		if m.host.PickFile != nil {
			pick, dir := m.host.PickFile, m.startDir()
			return m, func() program.Msg {
				path, chosen, err := pick(dir)
				return filePickedMsg{askOpen, path, chosen, err}
			}
		}
		return m.ask(askOpen, "Open the list", m.defaultPath()), nil
	case entrySave:
		if m.session.Path() == "" {
			return m.askWhereToSave(askSaveAs)
		}
		m.save("")
	case entrySaveAs:
		return m.askWhereToSave(askSaveAs)
	case entryUndo, entryRedo, entryCut, entryCopy, entryPaste, entryDelete, entryMoveUp, entryMoveDown:
		return m.editCommand(name)
	case entryPreferences:
		return m, func() program.Msg { return PreferencesRequestedMsg{} }
	case entryAbout:
		m.about = true
	case entryOpenFolder:
		m.openFolder()
	case entryShortcuts:
		m.shortcuts, m.shortcutsScroll = true, 0
	case entryDocs:
		m.openAddress(projectURL + "#readme")
	case entryReport:
		m.openAddress(m.reportAddress())
	case entryUpdates:
		if m.host.CheckForUpdate == nil {
			m.notice = "This build cannot look for updates"
			return m, nil
		}
		m.notice = "Looking for a newer version…"
		check := m.host.CheckForUpdate
		return m, func() program.Msg { return updateCheckedMsg{line: check()} }
	case entryQuit:
		return m.closeRequested()
	}
	return m, nil
}

// askWhereToSave shows the file window for a list to be saved, or asks for the path on the
// bottom line when the host has none.
func (m Model) askWhereToSave(p purpose) (Model, program.Cmd) {
	if m.host.SaveFile == nil {
		return m.ask(p, "Save the list as", m.defaultPath()), nil
	}
	dir := m.startDir()
	if p := m.session.Path(); p != "" {
		dir = filepath.Dir(p) // a list that has a file is saved beside it
	}
	save, name := m.host.SaveFile, filepath.Base(m.defaultPath())
	return m, func() program.Msg {
		path, chosen, err := save(dir, name)
		return filePickedMsg{p, path, chosen, err}
	}
}

// startDir is the folder the file windows start in: the last one used, else the folder of lists.
func (m Model) startDir() string {
	if m.lastDir != "" {
		return m.lastDir
	}

	return m.host.ListDir
}

// rememberDir keeps the folder of path as the one the file windows start in next time.
func (m *Model) rememberDir(path string) {
	dir := filepath.Dir(path)
	if path == "" || dir == m.lastDir {
		return
	}
	m.lastDir = dir
	if m.host.RememberDir != nil {
		m.host.RememberDir(dir)
	}
}

func (m Model) defaultPath() string {
	if p := m.session.Path(); p != "" {
		return p
	}
	return filepath.Join(m.host.ListDir, "list"+playlistfile.Extension)
}

func (m *Model) save(path string) {
	if err := m.session.Save(path); err != nil {
		m.notice = "Cannot save the list: " + err.Error()
		return
	}
	m.done = "Saved " + m.session.Path()
	m.rememberDir(m.session.Path())
}

// ask opens the one-line question of the window.
func (m Model) ask(p purpose, prompt, value string) Model {
	m.asking, m.askPrompt, m.askText = p, prompt, value
	return m
}

// answer ends the question with what was written: with nothing written it only closes.
func (m Model) answer() (program.Model, program.Cmd) {
	outcome, text := linequestion.Decide("enter", m.askText)
	p := m.asking
	m.asking = askNone
	if outcome != linequestion.Answered {
		return m, nil
	}
	return m.answered(p, text)
}

func (m Model) answered(p purpose, text string) (program.Model, program.Cmd) {
	switch p {
	case askOpen:
		list, err := downloadlist.Open(withExtension(text))
		if err != nil {
			m.notice = "Cannot open the list: " + err.Error()
			return m, nil
		}
		m.session = list
		m.dl.Show(list.Preview())
		m.done = "Opened " + list.Path()
		m.rememberDir(list.Path())
	case askSaveAs:
		m.save(withExtension(text))
	case askSaveThenStart, askSaveThenReview:
		m.save(withExtension(text))
		if m.session.Path() == "" {
			return m, nil
		}
		return m.start(p == askSaveThenReview)
	case askAddLink, askChangeLink:
		if reason := notALink(text); reason != "" {
			m.notice = reason
			return m.ask(p, linequestion.LinkPrompt(p == askChangeLink), text), nil // asked again, with what was typed
		}
		links, _ := parseLinks(text)
		return m.answeredLink(p, strings.Join(links, "\n"))
	}
	return m, nil
}

// answeredLink does what a link written on the bottom line says: it adds the link to the
// run, or to the list, or changes the one being changed.
func (m Model) answeredLink(p purpose, text string) (program.Model, program.Cmd) {
	switch p {
	case askAddLink:
		if m.addable() {
			m = m.addToRun([]string{text})
		} else {
			m = m.addAddresses(text)
		}
	case askChangeLink:
		m = m.changeAddress(m.changing, text)
	}
	return m, nil
}

func withExtension(path string) string {
	if filepath.Ext(path) == "" {
		return path + playlistfile.Extension
	}
	return path
}

// syncFile writes the list to its file, when it has one.
func (m *Model) syncFile() {
	if m.session.Path() == "" {
		return
	}
	if err := m.session.Save(""); err != nil {
		m.notice = "Cannot save the list: " + err.Error()
	}
}

// start begins the downloads of the list, or its review. A list with no file is saved
// first, so what happens to it is never lost.
func (m Model) start(review bool) (Model, program.Cmd) {
	if refusal := runcontrol.Refusal(m.facts(), len(m.session.Sources()), m.host.Start != nil); refusal != "" {
		m.notice = refusal
		return m, nil
	}
	if state, waiting := m.toolsWaiting(); waiting {
		m.caution, m.done = state.Message, ""
		return m, nil
	}
	m.loadedKey = m.sourcesKey()
	if m.session.Path() == "" {
		// A new list is kept as a draft in the app's own folder, so a download starts at once and
		// nothing is lost; File > Save as gives it a name of the person's own.
		if draft := m.draftPath(); draft != "" {
			if err := m.session.Save(draft); err != nil {
				m.notice = "Cannot save the list: " + err.Error()
				return m, nil
			}
			m.done = "Kept this list as a draft: " + filepath.Base(draft) + " (File > Open finds it)"
		}
	}
	if m.session.Path() == "" {
		p := askSaveThenReview
		if review {
			p = askSaveThenReview
		}
		if m.host.SaveFile != nil {
			return m.askWhereToSave(p)
		}
		return m.ask(p, "Save the list as, then it starts", m.defaultPath()), nil
	}
	if err := os.MkdirAll(m.cfg.OutputDir, 0o755); err != nil {
		m.notice = "Cannot create the download folder: " + err.Error()
		return m, nil
	}
	sources, plan := m.session.Inputs()
	m.life.BeginStart()
	m.notice = ""
	host, cfg := m.host, m.cfg
	return m, func() program.Msg {
		run, err := host.Start(cfg, sources, plan, review)
		return runStartedMsg{run: run, err: err, review: review}
	}
}

func (m Model) runStarted(msg runStartedMsg) (program.Model, program.Cmd) {
	m.life.Started()
	if msg.err != nil {
		m.notice = "Cannot start the downloads: " + msg.err.Error()
		return m, nil
	}
	m.run = msg.run
	m.dl.Attach(msg.run)
	m.events = msg.run.Events()
	m.dl.Paused = msg.run.Paused()
	return m, program.Batch(waitEvent(m.events), saveTick())
}

// syncList brings the list up to date with the run and writes it.
func (m *Model) syncList() {
	if m.run == nil {
		return
	}
	if err := m.session.SyncSnapshot(m.run.Snapshot()); err != nil {
		m.notice = "Cannot save the list: " + err.Error()
	}
}

func saveTick() program.Cmd {
	return program.Tick(saveEvery, func(t time.Time) program.Msg { return saveTickMsg(t) })
}

// stop ends the run: the downloads under way are cancelled, and what each song got to is
// written to the list. With quit the app ends afterwards.
func (m Model) stop(quit bool) (Model, program.Cmd) {
	if m.run == nil {
		if quit {
			return m, m.quit()
		}
		m.notice = runcontrol.NothingRunning
		return m, nil
	}
	m.syncList()
	m.life.BeginStop()
	run, session := m.run, m.session
	return m, func() program.Msg {
		run.Close()
		_ = session.SyncSnapshot(run.Snapshot())
		return runClosedMsg{quit: quit}
	}
}

func (m Model) quit() program.Cmd {
	quit := m.host.Quit
	return func() program.Msg {
		if quit != nil {
			quit()
		}
		return program.Quit()
	}
}

func (m Model) togglePause() Model {
	if m.run == nil {
		m.notice = runcontrol.NothingRunning
		return m
	}
	held := m.run.Paused()
	if held {
		m.run.Resume()
	} else {
		m.run.Pause()
	}
	m.done = runcontrol.PauseNotice(!held)
	m.dl.Paused = m.run.Paused()

	return m
}

func (m Model) retryAll() Model {
	if m.run == nil {
		m.notice = runcontrol.NothingRunning
		return m
	}
	m.done = runcontrol.RetryNotice(m.run.RetryAll())
	return m
}

// Reconfigure tells the run, if there is one, that the settings changed.
func (m Model) Reconfigure(cfg config.Config, live engine.LiveSettings) Model {
	m.cfg = cfg
	if m.run != nil {
		m.run.Reconfigure(live)
	}
	return m
}

// finished says whether the run has nothing more to do (see runcontrol).
func (m Model) finished() bool { return m.facts().Finished() }

// active says whether a run is going on that has to be stopped before the list can change: one
// that has finished does not.
func (m Model) active() bool { return m.facts().Active() }

// settle ends a run that has finished, so the list can be changed or another run started: what
// each song got to is written to the list, the run is closed (it has nothing to wind down, so this
// is quick) and the screen goes back to the list. A run that has not finished is left alone.
func (m Model) settle() Model {
	if !m.finished() {
		return m
	}
	m.syncList()
	m.run.Close()
	m.run = nil
	m.detach()
	m.dl.Show(m.session.Preview())

	return m
}

// holdsOnlyTheList says whether the run does nothing that stopping it would lose (see runcontrol).
func (m Model) holdsOnlyTheList() bool { return m.facts().HoldsOnlyTheList() }

// stopThen stops the run, and does what msg asks once it has wound down.
func (m Model) stopThen(msg program.Msg) (program.Model, program.Cmd) {
	m.life.WaitThen(msg)

	return m.stop(false)
}

// settles says whether an entry needs the list to be free, and so ends a finished run first.
func settles(name string) bool {
	switch name {
	case entryNew, entryOpen, entryStart, entryAddLink,
		entryUndo, entryRedo, entryCut, entryPaste, entryDelete, entryMoveUp, entryMoveDown:
		return true
	}

	return false
}

// openFolder shows the folder of the videos in the system's file manager.
func (m *Model) openFolder() {
	dir := m.cfg.OutputDir
	switch {
	case dir == "":
		m.notice = "No folder is chosen for the videos yet: choose one in File > Preferences"
	case m.host.OpenFolder == nil:
		m.caution = "The videos are in " + dir
	default:
		if _, err := os.Stat(dir); err != nil {
			m.caution = "The folder is made when the first download starts: " + dir

			return
		}
		if err := m.host.OpenFolder(dir); err != nil {
			m.notice = "Cannot open the folder: " + err.Error()
		}
	}
}

// ListPath is the file the list is kept in, "" while it has none.
func (m Model) ListPath() string { return m.session.Path() }

// draftPath is where a list that has no file yet is kept when it starts: "Untitled list.mvd" in
// the app's folder of lists, or "Untitled list 2.mvd" and so on when that is taken. It is "" when
// the host has no such folder, and the person is asked where to save the list then.
func (m Model) draftPath() string {
	dir := m.host.ListDir
	if dir == "" {
		return ""
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return ""
	}
	for n := 1; n < 1000; n++ {
		name := "Untitled list"
		if n > 1 {
			name = fmt.Sprintf("Untitled list %d", n)
		}
		path := filepath.Join(dir, name+playlistfile.Extension)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return path
		}
	}

	return ""
}

// detach lets the run go, keeping what it reported.
func (m *Model) detach() {
	m.dl.Detach()
	m.events = nil
}
