package workspace

import (
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
	"youtube-downloader/libs/mvd-core/engine"
)

func withTools(state *ToolsState, addresses ...string) Model {
	start := func(config.Config, []string, []engine.PlannedEntry, bool) (ListRun, error) { return nil, nil }
	m := New(Host{Start: start, Tools: func() ToolsState { return *state }}, config.Config{}, downloadlist.New(addresses))

	return sized(m)
}

func TestOnceTheToolsAreReadyStartIsNoLongerHeldBack(t *testing.T) {
	state := &ToolsState{Message: "Getting the download tools..."}
	m := withTools(state, "https://a")
	state.Ready, state.Message = true, ""
	if buttons := m.buttons(); buttons[0].disabled {
		t.Error("Start is still disabled after the tools are ready")
	}
	if state, waiting := m.toolsWaiting(); waiting {
		t.Errorf("the tools still say %q", state.Message)
	}
}

func TestTheStatusIsLookedAtAgainWhileTheToolsAreComing(t *testing.T) {
	state := &ToolsState{Message: "Getting the download tools..."}
	if cmd := withTools(state, "https://a").toolsTick(); cmd == nil {
		t.Error("nothing wakes the screen to look at the tools again")
	}
	state.Ready = true
	if cmd := withTools(state, "https://a").toolsTick(); cmd != nil {
		t.Error("a screen with its tools ready should not keep waking up")
	}
}

func TestWithoutAToolsStateEverythingWorksAsBefore(t *testing.T) {
	m := listOf("https://a")
	if buttons := m.buttons(); buttons[0].disabled {
		t.Error("Start is disabled though nothing says the tools are missing")
	}
}
