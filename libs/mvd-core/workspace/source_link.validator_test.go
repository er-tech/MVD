package workspace

import (
	"strings"
	"testing"
)

func TestWhatCanBeASourceOfSongs(t *testing.T) {
	for _, ok := range []string{
		"https://www.youtube.com/watch?v=jNQXAC9IVRw",
		"http://example.test/x",
		"https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
		"www.youtube.com/playlist?list=PL1",
		"youtu.be/jNQXAC9IVRw",
		"music.apple.com/us/playlist/x/pl.1",
		`C:\Users\me\songs.txt`,
		`"C:\Users\me\Music\my songs.csv"`,
		"/home/me/songs.tsv",
		"  https://a.test/b  ",
		"",
	} {
		if reason := notALink(ok); reason != "" {
			t.Errorf("%q was refused: %s", ok, reason)
		}
	}
}

func TestWhatIsNotASourceOfSongsSaysWhy(t *testing.T) {
	cases := map[string]string{
		"hello this is not a link": "words that are not links",
		"hello":                    "does not look like a link",
		"ftp://example.test/x":     "Only web addresses",
		"https://":                 "not a complete web address",
		"javascript:alert(1)":      "does not look like a link",
		"just.some.words and more": "words that are not links",
	}
	for text, want := range cases {
		reason := notALink(text)
		if reason == "" || !strings.Contains(reason, want) {
			t.Errorf("%q: got %q, want a reason containing %q", text, reason, want)
		}
	}
}

func TestSeveralLinksPastedTogetherAreSeveralSources(t *testing.T) {
	links, reason := parseLinks("https://youtu.be/a https://youtu.be/b\nopen.spotify.com/playlist/c")
	if reason != "" || len(links) != 3 {
		t.Errorf("links %v, reason %q", links, reason)
	}
	if _, reason := parseLinks("https://youtu.be/a and a word"); reason == "" {
		t.Error("a word among links was accepted")
	}
}
