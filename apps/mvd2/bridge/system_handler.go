package bridge

import (
	"errors"
	"net/url"
)

// OpenLink opens an address in the browser. Only web addresses are opened: the page shows links of
// the videos it found, and a link must never start a program.
//
// address is the link. The error says it is not a web address.
func (a *App) OpenLink(address string) error {
	parsed, err := url.Parse(address)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
		return errors.New("only web addresses can be opened")
	}
	if a.host.OpenLink != nil {
		a.host.OpenLink(a.context(), address)
	}

	return nil
}

// OpenOutputFolder shows the folder the songs are saved in.
func (a *App) OpenOutputFolder() error {
	if a.host.OpenFolder == nil {
		return errors.New("this system cannot show a folder")
	}

	return a.host.OpenFolder(a.prefs.Get().OutputDir)
}

// Quit closes the window.
func (a *App) Quit() {
	if a.host.Quit != nil {
		a.host.Quit(a.context())
	}
}
