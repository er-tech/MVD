package runhost

// Detail is everything the details panel shows for the selected source or song. Go decides what is
// worth saying; the page only lays it out.
type Detail struct {
	// Kind is "source" or "song", and ID the ID of the row.
	Kind  string `json:"kind"`
	ID    string `json:"id"`
	Title string `json:"title"`
	// Fields are the facts, in the order to show them. A fact with no value is left out.
	Fields []Field `json:"fields"`
	// Links are the addresses of the pages that belong to the item.
	Links []Link `json:"links"`
	// Log is what the engine said about the item, oldest first.
	Log []string `json:"log"`
}

// Field is one fact: a label and its value.
type Field struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// Link is an address with the words that say what it leads to.
type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}
