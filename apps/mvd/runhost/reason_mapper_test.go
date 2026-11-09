package runhost

import (
	"reflect"
	"testing"
)

func TestPlainReasonSaysEachStepAsASentence(t *testing.T) {
	got := plainReason(`found by searching: official video by "Twenty 4 Seven" (remembered (title 100%, artist's channel, YouTube Music: official video, same length)) (but it does not move)`)
	want := []string{
		`Found by searching YouTube: an official video by Twenty 4 Seven.`,
		`Remembered from an earlier search for this song, so it was not searched again.`,
		`Why it fits: the title matches 100%; it is on the artist's channel; YouTube Music calls it official video; it is as long as the song.`,
		`The picture does not move, so it is not taken as the official video.`,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}
}

func TestPlainReasonKeepsAnUnknownReason(t *testing.T) {
	if got := plainReason("chosen by you"); !reflect.DeepEqual(got, []string{"Chosen by you."}) {
		t.Fatalf("got %q", got)
	}
	if plainReason("") != nil {
		t.Fatal("no reason, no lines")
	}
}
