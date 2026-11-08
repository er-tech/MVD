package library

// Changes is what happened to the rows of one kind in a batch.
type Changes[T any] struct {
	Upserts []T      `json:"upserts"`
	Removed []string `json:"removed"`
}

// Batch is the changes between two revisions. A page at revision R applies the batch when
// From <= R < To. When From > R the page missed a batch and asks for everything again.
type Batch struct {
	From    uint64          `json:"from"`
	To      uint64          `json:"to"`
	Sources Changes[Source] `json:"sources"`
	Songs   Changes[Song]   `json:"songs"`
	// Run is the state of the run when it changed in the batch, nil when it did not.
	Run *Run `json:"run"`
}

// State is every source and song in the order they came in, at one revision.
type State struct {
	Revision uint64   `json:"revision"`
	Sources  []Source `json:"sources"`
	Songs    []Song   `json:"songs"`
	Run      Run      `json:"run"`
}
