//go:build darwin

package main

// Wails 2 uses UTType, which lives in the UniformTypeIdentifiers framework but is not linked by its own
// cgo flags. Linking it here makes a plain `go build` work, whichever task or script runs it.

/*
#cgo darwin LDFLAGS: -framework UniformTypeIdentifiers
*/
import "C"
