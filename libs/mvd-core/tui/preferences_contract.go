package tui

// What the preferences ask of the machine they run on. A host passes these in SetupInput.

// FolderPicker shows the operating system's own folder chooser, starting at start, and waits for
// the answer: the folder chosen, or chosen false when the person closed the chooser without
// choosing. It may take as long as the person does.
type FolderPicker func(start string) (path string, chosen bool, err error)

// MoveOutcome is how asking to move the app to its own folder went.
type MoveOutcome int

const (
	// MoveStarted: the person agreed and the app was moved and started from its new
	// place. It ends with this copy quitting.
	MoveStarted MoveOutcome = iota
	// MoveDeclined: the person said no, or the move failed and said so.
	MoveDeclined
	// MoveAlreadyThere: the app already lives in its own folder.
	MoveAlreadyThere
	// MoveUnavailable: there is nowhere to move it to on this machine, or no way to ask.
	MoveUnavailable
)

// Mover asks the person, on the machine's own screen, whether to move the app to its own folder,
// and moves it if they agree. It waits for the answers, which may take as long as the person does.
type Mover func() (MoveOutcome, error)

// RemovalOutcome is how asking to remove the app went.
type RemovalOutcome int

const (
	// RemovalStarted: the person agreed and the removal is under way. It ends with the app quitting.
	RemovalStarted RemovalOutcome = iota
	// RemovalDeclined: the person said no; nothing was removed.
	RemovalDeclined
	// RemovalUnavailable: this machine has no way to ask, so nothing was removed.
	RemovalUnavailable
)

// Uninstaller asks the person, on the machine's own screen, whether to remove the app, and starts
// the removal if they agree. It waits for the answers, which may take as long as the person does.
type Uninstaller func() (RemovalOutcome, error)
