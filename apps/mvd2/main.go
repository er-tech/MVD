package main

import (
	"context"
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/er-tech/MVD/apps/mvd2/bridge"
	"github.com/er-tech/MVD/libs/mvd-state/songrows"
)

// frontend is the page, built by apps/mvd2-web and copied here by the stage-web task.
//
//go:embed all:frontend/dist
var frontend embed.FS

func main() {
	app := bridge.New(func(ctx context.Context, batch songrows.Batch) {
		runtime.EventsEmit(ctx, bridge.RowsEvent, batch)
	})
	err := wails.Run(&options.App{
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
