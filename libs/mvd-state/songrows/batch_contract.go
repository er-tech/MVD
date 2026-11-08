package songrows

// Batch is the changes between two revisions. A page at revision R applies the batch when
// From <= R < To. When From > R the page missed a batch and asks for all the rows again.
type Batch struct {
	From    uint64   `json:"from"`
	To      uint64   `json:"to"`
	Upserts []Row    `json:"upserts"`
	Removed []string `json:"removed"`
}

// State is all the rows in the order they came in, at one revision.
type State struct {
	Revision uint64 `json:"revision"`
	Rows     []Row  `json:"rows"`
}
