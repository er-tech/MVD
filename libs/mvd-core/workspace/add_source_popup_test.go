package workspace

import (
	"testing"

	"youtube-downloader/libs/mvd-core/musicsearch"
)

func TestASearchPastedOrWrittenInAListFileIsAcceptedAsASource(t *testing.T) {
	address := musicsearch.Query{Artist: "Daft Punk", Song: "One More Time"}.Address()
	if links, reason := parseLinks(address); reason != "" || len(links) != 1 {
		t.Errorf("a search address was refused: %v %q", links, reason)
	}
	if _, reason := parseLinks(musicsearch.Scheme + "album=Discovery"); reason == "" {
		t.Error("a search with no artist was accepted")
	}
}
