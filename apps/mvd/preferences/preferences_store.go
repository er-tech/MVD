package preferences

import (
	"sync"

	"youtube-downloader/libs/mvd-core/config"
)

// Store keeps the settings in memory and in the config file. It is safe for many goroutines.
type Store struct {
	mu   sync.Mutex
	path string
	cfg  config.Config
}

// Open reads the config file at path, or makes it with the defaults on the first start.
//
// appDir is the app data folder and downloadsDir the folder the songs go to until the person
// chooses another. It returns the error of the file system when the file cannot be read or made.
func Open(path, appDir, downloadsDir string) (*Store, error) {
	cfg, _, err := config.LoadOrCreate(path, appDir, downloadsDir)
	if err != nil {
		return nil, err
	}

	return &Store{path: path, cfg: cfg}, nil
}

// Config is the settings as they are now. The engine takes them when a list starts.
func (s *Store) Config() config.Config {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.cfg
}

// Get is the preferences as they are now.
func (s *Store) Get() Preferences {
	return fromConfig(s.Config())
}

// Set checks the preferences and keeps them in memory and in the config file. It returns an error
// that says which field is wrong, or the error of the file system, and changes nothing then.
func (s *Store) Set(p Preferences) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	next, err := applyTo(s.cfg, p)
	if err != nil {
		return err
	}
	if err := config.Save(next, s.path); err != nil {
		return err
	}
	s.cfg = next

	return nil
}
