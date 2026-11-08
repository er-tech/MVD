import type { Run } from '../library'

/**
 * A speed in bytes a second as words.
 *
 * @param bytesPerSecond - the speed, 0 when nothing downloads.
 * @returns text such as `3.4 MB/s`, or `` for no speed.
 */
export function speedText (bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) {
    return ''
  }

  return bytesPerSecond >= 1_000_000 ? `${(bytesPerSecond / 1_000_000).toFixed(1)} MB/s` : `${Math.max(1, Math.round(bytesPerSecond / 1000))} KB/s`
}

/**
 * What the run is doing, in one line for the footer.
 *
 * @param run - the state of the run.
 * @returns the line: where the run is and the counts.
 */
export function runText (run: Run): string {
  const songs = `${run.songs} ${run.songs === 1 ? 'song' : 'songs'}`
  switch (run.phase) {
    case 'empty': {
      return 'Add a playlist or a song to begin.'
    }
    case 'loading': {
      return run.started
        ? `Loading and downloading: ${run.done} of ${songs} saved.`
        : `Loading… ${songs} found so far. Press Start to download what is ready.`
    }
    case 'ready': {
      return `${songs} ready. Press Start to download.`
    }
    case 'downloading': {
      return run.paused
        ? `Paused: ${run.done} of ${songs} saved.`
        : `Downloading: ${run.done} of ${songs} saved, ${run.active} in progress.`
    }
    case 'finished': {
      return run.failed > 0
        ? `Finished: ${run.done} of ${songs} saved, ${run.failed} failed.`
        : `Finished: ${run.done} of ${songs} saved.`
    }
  }
}
