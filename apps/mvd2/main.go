package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/er-tech/MVD/apps/mvd2/bridge"
	"github.com/er-tech/MVD/apps/mvd2/childprocs"
	"github.com/er-tech/MVD/apps/mvd2/preferences"
	"github.com/er-tech/MVD/apps/mvd2/runhost"
	"github.com/er-tech/MVD/libs/mvd-state/library"
	"youtube-downloader/apps/mvd/openfolder"
	"youtube-downloader/libs/mvd-core/appdir"
	"youtube-downloader/libs/mvd-core/deps"
)

// frontend is the page, built by apps/mvd2-web and copied here by the stage-web task.
//
//go:embed all:frontend/dist
var frontend embed.FS

// version is set by the release build.
var version = "dev"

func main() {
	// Whatever the engine starts, yt-dlp and ffmpeg, ends with the app, even when it is killed.
	if err := childprocs.Contain(); err != nil {
		log.Printf("cannot contain the programs the app starts: %v", err)
	}
	appDir, err := appdir.Dir()
	if err != nil {
		log.Fatalf("cannot open the app data folder: %v", err)
	}
	// The same files as the old window, so the settings and the unsaved list carry over.
	prefs, err := preferences.Open(filepath.Join(appDir, "config.conf"), appDir, appdir.DefaultVideosDir())
	if err != nil {
		log.Fatalf("cannot read the settings: %v", err)
	}
	binDir := filepath.Join(appDir, "bin")
	tools := deps.PrepareIn(binDir, func(deps.Event) {})
	ytDlpPath := deps.ToolPath(binDir, "yt-dlp")
	logf := func(format string, args ...any) { fmt.Fprintf(os.Stderr, format+"\n", args...) }

	ctx, cancel := context.WithCancel(context.Background())
	store := library.NewStore()
	session := runhost.New(ctx, store, runhost.RealBuild(ytDlpPath, logf), prefs.Config, filepath.Join(appDir, "unsaved-list.tmp"))
	app := bridge.New(store, session, prefs, host(tools), version, cancel)

	err = wails.Run(&options.App{
		Title:         "MVD",
		Width:         1180,
		Height:        760,
		MinWidth:      760,
		MinHeight:     480,
		AssetServer:   &assetserver.Options{Assets: frontend},
		OnStartup:     app.Startup,
		OnBeforeClose: app.BeforeClose,
		Bind:          []any{app},
	})
	if err != nil {
		log.Fatal(err)
	}
}

// host is what the app asks of the window and of the system, answered by the Wails runtime.
func host(tools *deps.Preparation) bridge.Host {
	listFilter := []runtime.FileFilter{{DisplayName: "MVD lists (*.mvd)", Pattern: "*.mvd"}}

	return bridge.Host{
		Emit: func(ctx context.Context, batch library.Batch) {
			runtime.EventsEmit(ctx, bridge.RowsEvent, batch)
		},
		PickListFile: func(ctx context.Context) (string, error) {
			return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{Title: "Open a list", Filters: listFilter})
		},
		PickSaveFile: func(ctx context.Context, name string) (string, error) {
			return runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{Title: "Save the list", DefaultFilename: name, Filters: listFilter})
		},
		PickFolder: func(ctx context.Context, start string) (string, error) {
			return runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{Title: "Folder for the songs", DefaultDirectory: start})
		},
		OpenLink:   runtime.BrowserOpenURL,
		OpenFolder: openfolder.Open,
		Quit:       runtime.Quit,
		Tools: func() bridge.Tools {
			if problem := tools.Problem(); problem != "" {
				return bridge.Tools{Message: problem, Failed: true}
			}
			if tools.Ready() {
				return bridge.Tools{Ready: true}
			}

			return bridge.Tools{Message: tools.Status()}
		},
	}
}
