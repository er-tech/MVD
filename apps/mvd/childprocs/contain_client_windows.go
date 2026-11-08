package childprocs

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// Contain puts the running program in a job that ends every process it starts, children and
// grandchildren, when the program ends, however it ends. The engine starts yt-dlp, and yt-dlp
// starts ffmpeg: ending only the first would leave the others running after the window closed.
//
// It returns the error of the system when the job cannot be made. Call it once, at the start.
func Contain() error {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return err
	}
	info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{}
	info.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
	if _, err := windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation,
		uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info))); err != nil {
		_ = windows.CloseHandle(job)

		return err
	}
	// The handle stays open for the life of the program: closing it, which the system does when the
	// program ends, is what ends the processes in the job.
	if err := windows.AssignProcessToJobObject(job, windows.CurrentProcess()); err != nil {
		_ = windows.CloseHandle(job)

		return err
	}

	return nil
}
