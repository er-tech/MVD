package workspace

import (
	"path/filepath"
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/program"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

func TestSavingAsAsksForTheNameInTheWindowAndKeepsTheFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "mine")
	m := sized(New(Host{ListDir: t.TempDir()}, config.Config{}, downloadlist.New([]string{"https://youtu.be/x"})))
	m = intent(m, windowsnapshot.Intent{Kind: windowsnapshot.IntentMenu, ID: entrySaveAs})
	if m.asking != askSaveAs || m.Window().Question == nil {
		t.Fatalf("asking %v, question %+v", m.asking, m.Window().Question)
	}
	m = intent(m, windowsnapshot.Intent{Kind: windowsnapshot.IntentQuestionText, Text: path})
	m = intent(m, windowsnapshot.Intent{Kind: windowsnapshot.IntentQuestionButton, ID: questionOK})
	if got := m.session.Path(); got != path+".mvd" {
		t.Errorf("path %q", got)
	}
	if !strings.HasPrefix(m.done, "Saved") || m.asking != askNone {
		t.Errorf("confirmation %q, asking %v", m.done, m.asking)
	}
}

func TestTheRunsEventsAreTakenInAndAnEarlierRunsAreNot(t *testing.T) {
	m, fake := started(t)
	next, cmd := m.Update(evMsg{ev: engine.EvIdle{}, from: fake.events})
	if cmd == nil || !next.(Model).dl.State.Idle {
		t.Errorf("the event of the run was not taken in, or the next was not waited for (cmd %v)", cmd != nil)
	}
	other := make(chan interface{})
	_, cmd = m.Update(evMsg{ev: engine.EvIdle{}, from: other})
	if cmd != nil {
		t.Error("the event of a run that was let go was taken for the run now shown")
	}
}

func TestTheBeatsAndEventsOfTheWorkspaceAreBackgroundMessagesAndIntentsAreNot(t *testing.T) {
	for _, msg := range []program.Msg{saveTickMsg{}, toolsTickMsg{}, evMsg{}, evClosed{}, runClosedMsg{}} {
		if !Background(msg) {
			t.Errorf("%T is not a background message", msg)
		}
	}
	if Background(WindowIntentMsg{}) || Background(program.WindowSizeMsg{}) {
		t.Error("what the person does is a background message")
	}
}

func TestPastedLinesBecomePlaylistsAfterTheSelectedOne(t *testing.T) {
	m := listOf("https://a", "https://z")
	m = m.addAddresses("https://b\n\n  https://c ")
	if got := addressesOf(m); len(got) != 4 || got[1] != "https://b" || got[2] != "https://c" || got[3] != "https://z" {
		t.Errorf("after the paste %v", got)
	}
}

func TestPasteOfTheEditMenuAddsTheLinksOnTheMachineClipboard(t *testing.T) {
	clip := &fakeClipboard{text: "https://one\nhttps://two"}
	m := sized(New(Host{Clipboard: clip}, config.Config{}, downloadlist.New([]string{"https://a"})))
	m, _ = choose(m, entryPaste)
	if got := addressesOf(m); len(got) != 3 || got[1] != "https://one" {
		t.Errorf("after pasting links %v", got)
	}
}

func TestTheAboutNoteNamesANewerVersionWhenOneIsKnown(t *testing.T) {
	m := sized(New(Host{Version: "1.2.3", UpdateNote: func() string { return "MVD 1.3.0 is available: Help > Check for updates." }}, config.Config{}, downloadlist.New([]string{"a"})))
	m, _ = choose(m, entryAbout)
	about := m.Window().Question
	if about == nil || !strings.Contains(strings.Join(about.Lines, "\n"), "MVD 1.3.0 is available") {
		t.Errorf("the About window does not name the newer version: %+v", about)
	}
}

func TestWhileTheToolsComeStartCannotBeUsedAndTheButtonSaysWhy(t *testing.T) {
	state := &ToolsState{Message: "Getting the download tools..."}
	m := withTools(state, "https://a")
	load := m.Window().Toolbar[0]
	if load.Enabled || load.DisabledReason != "Getting the download tools..." {
		t.Errorf("the first button is %+v", load)
	}
	if entryOf(t, m.Window(), entryStart).Enabled {
		t.Error("Load playlists can be chosen while the tools are fetched")
	}
}

func TestClosingAsksOnlyWhileSongsAreDownloading(t *testing.T) {
	idle := listOf("https://a")
	if next, cmd := idle.closeRequested(); next.closing.On || cmd == nil {
		t.Errorf("an idle app asked (%v) or did not close (cmd %v)", next.closing.On, cmd != nil)
	}
	m, _ := started(t)
	state := m.dl.State
	state.Apply(engine.EvPlaylistAdded{Source: engine.PlaylistSource{Index: 0, URL: "https://a"}})
	state.Apply(engine.EvPlaylistListed{Playlist: 0, Title: "a", Entries: entriesOf(2)})
	state.Apply(engine.EvEntryState{Entry: 0, State: engine.StateDownloading})
	if next, _ := m.closeRequested(); !next.closing.On {
		t.Error("the app closed while a song was downloading, with no question")
	}
}
