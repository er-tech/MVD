// MVD desktop app: a window of its own, drawn by a React page, that talks to this program through
// the methods and events of Wails 2. Go owns the list and the downloads and tells the page only what
// changed (see docs/architecture/rewrite-wails2.md). Closing the window quits.
package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/er-tech/MVD/libs/mvd-state/library"
	"youtube-downloader/apps/mvd/appmenu"
	"youtube-downloader/apps/mvd/bridge"
	"youtube-downloader/apps/mvd/childprocs"
	"youtube-downloader/apps/mvd/console"
	"youtube-downloader/apps/mvd/filetype"
	"youtube-downloader/apps/mvd/install"
	"youtube-downloader/apps/mvd/notification"
	"youtube-downloader/apps/mvd/openfolder"
	"youtube-downloader/apps/mvd/preferences"
	"youtube-downloader/apps/mvd/question"
	"youtube-downloader/apps/mvd/runhost"
	"youtube-downloader/apps/mvd/selfupdate"
	"youtube-downloader/apps/mvd/signin"
	"youtube-downloader/apps/mvd/toolupdates"
	"youtube-downloader/apps/mvd/uninstall"
	"youtube-downloader/libs/mvd-core/appdir"
	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/cookies"
	"youtube-downloader/libs/mvd-core/deps"
	"youtube-downloader/libs/mvd-core/openurl"
	"youtube-downloader/libs/mvd-core/playlistfile"
	"youtube-downloader/libs/mvd-core/ytdlp/fetch"
)

// frontend is the page, built by apps/mvd-web and copied here by the stage-web task.
//
//go:embed all:frontend/dist
var frontend embed.FS

var version = "dev"

func main() {
	console.AttachParent()

	// Older shortcuts and scripts pass these; there is no server to point or to run without a
	// window any more, so they are accepted and do nothing.
	flag.String("addr", "", "no longer used (kept for older scripts)")
	flag.Bool("no-window", false, "no longer used (kept for older scripts)")
	flag.Bool("no-browser", false, "no longer used (kept for older scripts)")
	flag.Bool("no-tray", false, "no longer used (kept for older scripts)")
	move := flag.Bool("move", false, "ask to move the app to its own folder now, whatever was answered before")
	movedFrom := flag.String("moved-from", "", "set by the app itself after moving to its folder: the old copy to remove")
	edit := flag.String("edit", "", "open a saved .mvd list; a .mvd file given by itself does the same")
	afterExit := flag.Int(selfupdate.AfterExitFlag, 0, "set by the app itself after an update: wait for this process to end before opening")
	removeApp := flag.Bool("uninstall", false, "remove MVD from this computer, after asking; Settings > Apps on Windows runs this")
	signInDir := flag.String(signin.Flag, "", "set by the app itself: show the window to sign in to YouTube, with its profile in this folder")
	flag.Parse()

	if *signInDir != "" {
		if err := signin.RunWindow(*signInDir); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

		return
	}

	// An updated program is started by the old one, which is still closing: it opens only once
	// that one has gone, so the two never share the single window.
	if *afterExit > 0 {
		selfupdate.WaitForExit(*afterExit, 30*time.Second)
	}
	// The old program an update renamed aside is removed, once nothing runs it.
	if exe, err := os.Executable(); err == nil {
		go install.CleanUpMovedProgram(exe + selfupdate.AsideSuffix)
	}

	if *removeApp {
		if err := runUninstall(); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			console.ShowFatal(err.Error())
			os.Exit(1)
		}

		return
	}

	list := *edit
	if list == "" && flag.NArg() == 1 && strings.EqualFold(filepath.Ext(flag.Arg(0)), playlistfile.Extension) {
		list = flag.Arg(0)
	}
	if err := run(*movedFrom, *move, list); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		console.ShowFatal(err.Error())
		os.Exit(1)
	}
}

// configPath is the settings file, the same one the older windows used.
func configPath(appDir string) string { return filepath.Join(appDir, "config.conf") }

func run(movedFrom string, askToMove bool, startupList string) error {
	logf := func(format string, a ...interface{}) { fmt.Printf(format+"\n", a...) }

	appDir, err := appdir.Dir()
	if err != nil {
		return fmt.Errorf("cannot open the app data folder: %w", err)
	}

	// The first time it is started from somewhere it does not belong, it offers to move
	// itself, and if that is accepted the moved copy takes over and this one is done.
	// -move asks whatever was answered before.
	if askToMove {
		switch install.MoveNow(appDir, version) {
		case install.Moved:
			return nil
		case install.AlreadyThere:
			logf("MVD already lives in its own folder.")
		case install.CannotMove:
			logf("MVD cannot be moved on this machine.")
		}
	} else if install.OfferMoveHere(appDir, true, movedFrom, version) {
		return nil
	}
	if movedFrom != "" {
		go install.CleanUpMovedProgram(movedFrom)
	}

	// Whatever the engine starts, yt-dlp and ffmpeg, ends with the app, even when it is killed.
	if err := childprocs.Contain(); err != nil {
		logf("cannot contain the programs the app starts: %v", err)
	}

	prefs, err := preferences.Open(configPath(appDir), appDir, appdir.DefaultVideosDir())
	if err != nil {
		return fmt.Errorf("cannot read the settings: %w", err)
	}

	// The tools live in the app-data folder: the same place on every start, and one the
	// person can always write to, whatever folder the app was started from.
	notify := notification.Notify
	binDir := filepath.Join(appDir, "bin")
	// Fetched in the background on the first start, so the window opens at once and says what is
	// going on; the downloads wait for it (see Host.Tools).
	tools := deps.PrepareIn(binDir, toolupdates.Reporter(logf, notify))
	ytDlpPath := deps.ToolPath(binDir, "yt-dlp")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	sessionCtx, cancelSession := context.WithCancel(ctx)
	defer cancelSession()

	store := library.NewStore()
	session := runhost.New(sessionCtx, store, runhost.RealBuild(ytDlpPath, logf), prefs.Config, filepath.Join(appDir, "unsaved-list.tmp"))

	// The window's context, which the menu and the other threads need to reach the window.
	var window atomic.Value
	emit := func(event string, data ...any) {
		if wctx, found := window.Load().(context.Context); found {
			runtime.EventsEmit(wctx, event, data...)
		}
	}

	// yt-dlp and ffmpeg are kept up to date: checked in the background at start, and again
	// when a download fails, after which the failed downloads are tried again.
	checker := &selfupdate.Checker{
		Dir: appDir, Version: version, Notify: notify, Ask: question.Ask, Open: openurl.Open, Logf: logf,
		// The switch is in the preferences, read each time so a change counts at once.
		Enabled: func() bool { return prefs.Config().CheckForUpdates },
		// A newer version put in place asks the window to close, which asks the person if downloads run.
		Quit: func() { emit("close-requested") },
	}
	updates := toolupdates.New(
		func() []string {
			return deps.UpdateIn(binDir, toolupdates.Reporter(logf, func(notification.Notice) {}))
		},
		session.RetryFailed,
		notify, logf, time.Now,
	)
	session.OnFailure(updates.AfterFailure)

	app := bridge.New(store, session, prefs, host(tools, checker, appDir, ytDlpPath, startupList, ctx), version, cancelSession)

	// .mvd files are download lists of this program: they get its icon and open it. It is
	// told at every start, so it follows the program when it moves.
	if exe, err := os.Executable(); err == nil {
		if err := filetype.Register(exe); err != nil {
			logf("cannot register the .mvd file type: %v", err)
		}
	}

	fmt.Printf("MVD %s\n", version)
	// Looking for newer tools waits for the first fetch, so the two never write the same file.
	go func() {
		_ = tools.Wait(ctx)
		updates.AtStart()
	}()
	// A newer MVD is looked for once a day, in the background; the person is only told.
	go checker.AtStart(ctx)

	// A list double clicked while the app is open is opened in the window that is.
	openList := func(path string) {
		if list := filetype.ListInArgs([]string{path}); list != "" {
			emit("open-file", list)
		}
	}
	err = wails.Run(&options.App{
		Title:       "MVD",
		Width:       1180,
		Height:      760,
		MinWidth:    760,
		MinHeight:   480,
		AssetServer: &assetserver.Options{Assets: frontend},
		// A .mvd dropped on the window opens as the list; links dropped from a browser reach the page as text.
		DragAndDrop: &options.DragAndDrop{EnableFileDrop: true},
		Menu:       appmenu.Build(func(action string) { menuAction(&window, action) }),
		OnStartup: func(wctx context.Context) {
			window.Store(wctx)
			app.Startup(wctx)
		},
		OnBeforeClose: app.BeforeClose,
		Bind:          []any{app},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "mvd-app-3b7c2f1e",
			OnSecondInstanceLaunch: func(second options.SecondInstanceData) {
				if wctx, found := window.Load().(context.Context); found {
					runtime.WindowUnminimise(wctx)
					runtime.Show(wctx)
				}
				for _, arg := range second.Args {
					openList(arg)
				}
			},
		},
		// macOS hands a double clicked .mvd over this way instead of in the arguments.
		Mac: &mac.Options{OnFileOpen: openList},
	})
	stop()
	// An update put in place while the app ran opens as soon as the app has closed.
	if exe := checker.Relaunch(); exe != "" {
		if startErr := selfupdate.Relaunch(exe); startErr != nil {
			logf("The updated MVD could not be started: %v", startErr)
		}
	}

	return err
}

// menuAction sends a menu choice to the page, or quits for Quit.
func menuAction(window *atomic.Value, action string) {
	wctx, found := window.Load().(context.Context)
	switch {
	case !found:
	case action == "quit":
		runtime.Quit(wctx)
	default:
		runtime.EventsEmit(wctx, "menu", action)
	}
}

// host is what the app asks of the window and of the system, answered by the Wails runtime and by
// the platform packages of the app.
func host(tools *deps.Preparation, checker *selfupdate.Checker, appDir, ytDlpPath, startupList string, ctx context.Context) bridge.Host {
	listFilter := []runtime.FileFilter{{DisplayName: "MVD lists (*.mvd)", Pattern: "*.mvd"}}
	bridged := bridge.Host{
		Emit: func(wctx context.Context, batch library.Batch) {
			runtime.EventsEmit(wctx, bridge.RowsEvent, batch)
		},
		PickListFile: func(wctx context.Context) (string, error) {
			return runtime.OpenFileDialog(wctx, runtime.OpenDialogOptions{Title: "Open a list", Filters: listFilter})
		},
		PickSaveFile: func(wctx context.Context, name string) (string, error) {
			return runtime.SaveFileDialog(wctx, runtime.SaveDialogOptions{Title: "Save the list", DefaultFilename: name, Filters: listFilter})
		},
		PickFolder: func(wctx context.Context, start string) (string, error) {
			return runtime.OpenDirectoryDialog(wctx, runtime.OpenDialogOptions{Title: "Folder for the songs", DefaultDirectory: start})
		},
		OpenLink:   runtime.BrowserOpenURL,
		OpenFolder: openfolder.Open,
		Quit:       runtime.Quit,
		AskClose: func(wctx context.Context) {
			runtime.EventsEmit(wctx, "close-requested")
		},
		CheckForUpdate: func() string { return checker.CheckNow(ctx) },
		UpdateNote:     checker.Note,
		StartupList:    startupList,
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
	// Signing in inside MVD is only done on Windows, where yt-dlp can read the window's cookies.
	if goruntime.GOOS == "windows" {
		ytArgs := fetch.NormalizeArgs(config.Default(appDir, "").ExtraArgs)
		bridged.SignIn = func(wctx context.Context) (string, error) { return signin.Run(wctx, appDir, ytDlpPath, ytArgs) }
		bridged.SignInState = func() string { return cookies.SignInState(appDir) }
	}
	// Moving is offered when the app runs from somewhere it could be moved out of, whatever was
	// answered when it asked by itself.
	if install.CanBeMoved(appDir, version) {
		bridged.Move = func(wctx context.Context) (string, error) {
			switch install.MoveNow(appDir, version) {
			case install.Moved:
				// The moved copy has started: this one ends once the answer is given.
				go runtime.Quit(wctx)

				return "MVD was moved to its own folder and starts again from there.", nil
			case install.AlreadyThere:
				return "MVD already lives in its own folder.", nil
			case install.CannotMove:
				return "", errors.New("MVD cannot be moved on this machine")
			}

			return "MVD was not moved.", nil
		}
	}
	bridged.Uninstall = func(wctx context.Context) (string, error) {
		remove, err := uninstall.Here(version, appDir, configPath(appDir), nil).Confirm(nil)
		switch {
		case errors.Is(err, uninstall.ErrDeclined):
			return "MVD was not removed.", nil
		case errors.Is(err, uninstall.ErrNoDialog):
			return "", errors.New("there is no way to ask for confirmation on this machine, so nothing was removed")
		case err != nil:
			return "", err
		}
		// The removal ends with the app quitting, after the answer has been given.
		go remove()

		return "MVD is being removed.", nil
	}

	return bridged
}

func runUninstall() error {
	appDir, err := appdir.Dir()
	if err != nil {
		return fmt.Errorf("cannot open the app data folder: %w", err)
	}
	remove, err := uninstall.Here(version, appDir, configPath(appDir), nil).Confirm(nil)
	switch {
	case errors.Is(err, uninstall.ErrDeclined):
		return nil
	case errors.Is(err, uninstall.ErrNoDialog):
		return errors.New("there is no way to ask for confirmation on this machine, so nothing was removed")
	case err != nil:
		return err
	}
	remove()

	return nil
}
