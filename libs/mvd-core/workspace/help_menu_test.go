package workspace

import (
	"net/url"
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/downloadlist"
)

func TestEveryRunEntryHasItsOwnShortcutAndOnlyPauseAndResumeShareOne(t *testing.T) {
	seen := map[string]string{}
	for _, mn := range menus() {
		if mn.Name != "Run" {
			continue
		}
		for _, e := range mn.Entries {
			if e.Separator {
				continue
			}
			if e.Shortcut == "" {
				t.Errorf("%q has no shortcut", e.Name)
			}
			if other, ok := seen[e.Shortcut]; ok && (e.Name != entryResume || other != entryPause) {
				t.Errorf("%q and %q share %s", other, e.Name, e.Shortcut)
			}
			seen[e.Shortcut] = e.Name
		}
	}
}

func TestNoShortcutIsGivenToTwoDifferentThingsAnywhere(t *testing.T) {
	seen := map[string]string{}
	for _, mn := range menus() {
		for _, e := range mn.Entries {
			if e.Separator || e.Shortcut == "" {
				continue
			}
			if other, ok := seen[e.Shortcut]; ok && (e.Name != entryResume || other != entryPause) {
				t.Errorf("%q and %q share %s", other, e.Name, e.Shortcut)
			}
			seen[e.Shortcut] = e.Name
		}
	}
}

func TestDocumentationAndReportAProblemOpenTheBrowser(t *testing.T) {
	var opened []string
	m := New(Host{Version: "1.2.3", Open: func(u string) error { opened = append(opened, u); return nil }}, config.Config{}, downloadlist.New([]string{"a"}))
	m = sized(m)
	next, _ := m.Update(entryChosenMsg{entryDocs})
	_, _ = next.(Model).Update(entryChosenMsg{entryReport})
	if len(opened) != 2 {
		t.Fatalf("opened %v", opened)
	}
	if !strings.HasPrefix(opened[0], projectURL) {
		t.Errorf("the documentation opened %q", opened[0])
	}
	u, err := url.Parse(opened[1])
	if err != nil || !strings.HasSuffix(u.Path, "/issues/new") {
		t.Fatalf("the report opened %q (%v)", opened[1], err)
	}
	if body := u.Query().Get("body"); !strings.Contains(body, "MVD 1.2.3") {
		t.Errorf("the report does not carry the version: %q", body)
	}
}

func TestWithoutABrowserTheAddressIsSaidInstead(t *testing.T) {
	m := listOf("https://a")
	next, _ := m.Update(entryChosenMsg{entryDocs})
	if got := next.(Model).notice; !strings.Contains(got, projectURL) {
		t.Errorf("the notice is %q", got)
	}
}
