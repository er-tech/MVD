package engine

import (
	"context"
	"testing"
)

func TestSnapshotOfAListedSongKeepsWhatTheListingSaid(t *testing.T) {
	eng := stubEngine(t, true, "https://youtube.com/playlist?list=A")
	eng.entries = append(eng.entries, &engineEntry{
		info:  EntryInfo{ID: 0, Playlist: 0, Index: 5, VideoID: "vid", Title: "Some Song", Channel: "Some Channel"},
		state: StateQueued,
	})
	snap := eng.Snapshot()
	if len(snap) != 1 {
		t.Fatalf("snapshot %+v", snap)
	}
	up := snap[0].Upload
	if up.ID != "vid" || up.Title != "Some Song" || up.Channel != "Some Channel" || up.PlaylistIndex != 5 {
		t.Errorf("upload %+v: the file would lose the name of the song", up)
	}
}

func TestSnapshotNamesEverySongWithItsVersionAndState(t *testing.T) {
	eng := stubEngine(t, true, "https://youtube.com/playlist?list=A")
	eng.opts.HoldForReview = true
	eng.live = liveOf(eng.opts)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { eng.Run(ctx); close(done) }()
	collect(t, eng)

	snap := eng.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("snapshot has %d songs, want 3: %+v", len(snap), snap)
	}
	byUpload := map[string]EntrySnapshot{}
	for _, s := range snap {
		byUpload[s.Upload.ID] = s
		if s.State != StatePlanned || s.PlaylistURL != "https://youtube.com/playlist?list=A" {
			t.Errorf("song %+v: want planned in playlist A", s)
		}
	}
	if s := byUpload["aaaaaaaaaa1"]; s.Kind != KindOfficial || s.TargetID != "OFFICIAL001" {
		t.Errorf("art track: %+v", s)
	}
	cancel()
	for range eng.Events() {
	}
	<-done
}
