import type { Run } from '../library'

/** Which buttons of the toolbar work now. */
export interface ToolbarButtons {
  add:    boolean
  start:  boolean
  pause:  boolean
  resume: boolean
  retry:  boolean
}

/**
 * Which buttons work, from the state of the run. Start works while the songs are still being loaded:
 * the songs that are found go to the downloads at once.
 *
 * @param run - the state of the run.
 * @param toolsReady - whether the download tools are there. Nothing can be added or started before.
 * @returns what each button may do.
 */
export function toolbarButtons (run: Run, toolsReady: boolean): ToolbarButtons {
  const loadingOrReady = run.phase === 'loading' || run.phase === 'ready'

  return {
    add:    toolsReady,
    start:  toolsReady && !run.started && loadingOrReady && run.sources > 0,
    pause:  run.started && !run.paused && run.phase === 'downloading',
    resume: run.started && run.paused,
    retry:  run.failed > 0,
  }
}
