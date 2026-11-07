package appdir

import "golang.org/x/sys/windows"

// systemDocumentsDir asks Windows where the Documents folder is, as it may be moved, for example
// into OneDrive. It returns "" when Windows does not say.
func systemDocumentsDir() string {
	dir, err := windows.KnownFolderPath(windows.FOLDERID_Documents, windows.KF_FLAG_DEFAULT)
	if err != nil {
		return ""
	}

	return dir
}
