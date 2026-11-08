package preferences

import (
	"path/filepath"
	"testing"
)

func open(t *testing.T) (*Store, string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "setup.conf")
	store, err := Open(path, dir, filepath.Join(dir, "music"))
	if err != nil {
		t.Fatal(err)
	}

	return store, path
}

func TestTheFirstStartMakesTheDefaults(t *testing.T) {
	store, _ := open(t)
	p := store.Get()
	if p.VideoQuality != "best" || p.OfficialVideo != "yes" || p.MaxDownloads != 4 || p.OutputDir == "" {
		t.Fatalf("defaults %+v", p)
	}
}

func TestAChangeIsKeptAndReadAgainByTheNextStart(t *testing.T) {
	store, path := open(t)
	p := store.Get()
	p.MaxDownloads = 7
	p.OfficialVideo = "only"
	p.BetterAudio = true
	if err := store.Set(p); err != nil {
		t.Fatal(err)
	}
	dir := filepath.Dir(path)
	again, err := Open(path, dir, filepath.Join(dir, "music"))
	if err != nil {
		t.Fatal(err)
	}
	if got := again.Get(); got != p {
		t.Fatalf("read %+v, want %+v", got, p)
	}
	if again.Config().MaxConcurrentDownloads != 7 {
		t.Fatalf("config has %d downloads, want 7", again.Config().MaxConcurrentDownloads)
	}
}

func TestAWrongValueIsRefusedWithTheFieldNamedAndNothingChanges(t *testing.T) {
	store, _ := open(t)
	before := store.Get()
	cases := map[string]func(*Preferences){
		"folder":   func(p *Preferences) { p.OutputDir = "  " },
		"video":    func(p *Preferences) { p.VideoQuality = "8k" },
		"audio":    func(p *Preferences) { p.AudioQuality = "loud" },
		"official": func(p *Preferences) { p.OfficialVideo = "maybe" },
		"few":      func(p *Preferences) { p.MaxDownloads = 0 },
		"many":     func(p *Preferences) { p.MaxDownloads = 99 },
		"name":     func(p *Preferences) { p.OutputTemplate = "" },
		"merge":    func(p *Preferences) { p.MergeFormat = "avi" },
		"retries":  func(p *Preferences) { p.RetryCycles = 0 },
		"wait":     func(p *Preferences) { p.RetryWaitSeconds = 4000 },
		"parts":    func(p *Preferences) { p.ConcurrentFragments = 17 },
		"slow":     func(p *Preferences) { p.StartTimeoutSeconds = 5 },
		"cookies":  func(p *Preferences) { p.CookieSource = "netscape" },
		"log":      func(p *Preferences) { p.CreateLogFile, p.LogDir = true, " " },
	}
	for name, change := range cases {
		p := before
		change(&p)
		if err := store.Set(p); err == nil {
			t.Fatalf("%s: a wrong value was accepted", name)
		}
		if store.Get() != before {
			t.Fatalf("%s: the preferences changed after a refusal", name)
		}
	}
}

func TestTheOptionsMatchWhatIsAccepted(t *testing.T) {
	store, _ := open(t)
	options := OptionsOf()
	for _, quality := range options.VideoQualities {
		p := store.Get()
		p.VideoQuality = quality
		if err := store.Set(p); err != nil {
			t.Fatalf("offered video quality %q was refused: %v", quality, err)
		}
	}
	for _, mode := range options.OfficialVideos {
		p := store.Get()
		p.OfficialVideo = mode
		if err := store.Set(p); err != nil {
			t.Fatalf("offered mode %q was refused: %v", mode, err)
		}
	}
}

func TestTheAdvancedSettingsAreKeptAndReadAgain(t *testing.T) {
	store, path := open(t)
	p := store.Get()
	p.MergeFormat = "mkv"
	p.RetryCycles = 12
	p.RetryWaitSeconds = 45
	p.ConcurrentFragments = 0
	p.StartTimeoutSeconds = 90
	p.CookieSource = "firefox"
	p.LogDir = filepath.Join(filepath.Dir(path), "logs")
	if err := store.Set(p); err != nil {
		t.Fatal(err)
	}
	dir := filepath.Dir(path)
	again, err := Open(path, dir, filepath.Join(dir, "music"))
	if err != nil {
		t.Fatal(err)
	}
	if got := again.Get(); got != p {
		t.Fatalf("read %+v, want %+v", got, p)
	}
	if cfg := again.Config(); cfg.CookiesFromBrowser != "firefox" || cfg.AutoCookies {
		t.Fatalf("a browser must be pinned and not all of them: %+v", cfg)
	}
	p.CookieSource = "all"
	if err := again.Set(p); err != nil {
		t.Fatal(err)
	}
	if cfg := again.Config(); !cfg.AutoCookies || cfg.CookiesFromBrowser != "" {
		t.Fatalf("all browsers must be tried and none pinned: %+v", cfg)
	}
}

func TestEveryOfferedChoiceOfTheAdvancedSettingsIsAccepted(t *testing.T) {
	store, _ := open(t)
	options := OptionsOf()
	for _, format := range options.MergeFormats {
		p := store.Get()
		p.MergeFormat = format
		if err := store.Set(p); err != nil {
			t.Fatalf("offered merge format %q was refused: %v", format, err)
		}
	}
	for _, source := range options.CookieSources {
		p := store.Get()
		p.CookieSource = source
		if err := store.Set(p); err != nil {
			t.Fatalf("offered cookie source %q was refused: %v", source, err)
		}
	}
}
