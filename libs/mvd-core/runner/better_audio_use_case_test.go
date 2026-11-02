package runner

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

func TestTheBestAudioStepSaysWhyItWasNotDone(t *testing.T) {
	var said []string
	log := func(format string, args ...any) { said = append(said, fmt.Sprintf(format, args...)) }

	err := notDone("this build of MVD has no music-fixer")(context.Background(), "abc", []string{"a.mp4"}, log)

	if err != nil {
		t.Fatalf("a missing music-fixer must not fail the song: %v", err)
	}
	if len(said) != 1 || !strings.Contains(said[0], "this build of MVD has no music-fixer") || !strings.Contains(said[0], "stays as it was downloaded") {
		t.Errorf("the log says %q", said)
	}
}
