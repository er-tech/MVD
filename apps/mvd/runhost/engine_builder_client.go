package runhost

import (
	"context"
	"fmt"
	"os"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/engine"
	"youtube-downloader/libs/mvd-core/runner"
)

// RealBuild is the Build that makes the real engine: it holds every song it finds until the person
// presses Start, and it makes the download folder first.
//
// ytDlpPath is the downloader the engine runs and logf receives the lines of progress that are not
// about one song (cookies, say); it may be nil.
func RealBuild(ytDlpPath string, logf func(string, ...interface{})) Build {
	return func(ctx context.Context, cfg config.Config, sources []string, plan []engine.PlannedEntry) (Engine, error) {
		if err := os.MkdirAll(cfg.OutputDir, 0o755); err != nil {
			return nil, fmt.Errorf("cannot create the download folder %s: %w", cfg.OutputDir, err)
		}

		return runner.BuildListEngine(ctx, ytDlpPath, cfg, sources, plan, true, logf)
	}
}
