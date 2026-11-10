package runner

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"youtube-downloader/libs/mvd-core/engine"
)

func TestTheBestAudioStepSaysWhyItWasNotDone(t *testing.T) {
	var said []string
	log := func(format string, args ...any) { said = append(said, fmt.Sprintf(format, args...)) }

	err := notDone("this build of MVD has no music-fixer")(context.Background(), "abc", []string{"a.mp4"}, log)

	if !errors.Is(err, engine.ErrBestAudioSkipped) {
		t.Fatalf("a missing music-fixer must only say the step was skipped, not fail the song: %v", err)
	}
	if len(said) != 1 || !strings.Contains(said[0], "this build of MVD has no music-fixer") || !strings.Contains(said[0], "stays as it was downloaded") {
		t.Errorf("the log says %q", said)
	}
}
