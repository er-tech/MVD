//go:build !windows

package appdir

// systemDocumentsDir is "" here: the folder is Documents in the home folder, which the caller finds.
func systemDocumentsDir() string { return "" }
