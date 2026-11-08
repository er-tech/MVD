/** The name of a setting and the line that says what it does. */
export interface FieldText {
  label: string
  hint:  string
}

/** The names and descriptions of the settings, as the person reads them. */
export const fieldText = {
  outputDir:      { label: 'Videos Output Folder', hint: 'The folder your videos are saved in. Browse… picks another one.' },
  outputTemplate: {
    label: 'Output Template',
    hint:  'How each saved file is named and filed. Add a block such as ARTIST or TITLE, and type any text between them. Drag a block to move it. The way it is now works; change it only if you want to.',
  },
  videoQuality:  { label: 'Video Quality', hint: 'The best picture quality to download. A lower one makes smaller files.' },
  audioQuality:  { label: 'Audio Quality', hint: 'The sound quality to keep.' },
  mergeFormat:   { label: 'Merge Format', hint: 'The kind of video file made. MP4 plays almost everywhere; MKV and WebM can hold higher quality.' },
  officialVideo: {
    label: 'Download Official Music Video',
    hint:  'Yes: use the official music video when there is one, and the video as it is otherwise. Only: download just the songs that have one. No: never look for it.',
  },
  betterAudio: {
    label: 'Best Audio On The Video',
    hint:  'The video is recreated with the best possible music MVD can get: after an official music video is downloaded, the best quality of the song is fetched and put in place of its sound, lined up with the picture. It takes extra time for every song, and the video you downloaded is kept if anything goes wrong.',
  },
  maxDownloads:        { label: 'Max Concurrent Downloads', hint: 'How many videos are downloaded at the same time. More is faster but uses more of your connection.' },
  autoRetry:           { label: 'Retry Failed Downloads', hint: 'Try a download again by itself when it fails, because of a dropped connection, for example.' },
  retryCycles:         { label: 'Retry Attempts', hint: 'How many times a failed download is tried again before it is given up.' },
  retryWaitSeconds:    { label: 'Wait before retrying (seconds)', hint: 'The wait before the first retry, times the number of the attempt.' },
  concurrentFragments: { label: 'Parts downloaded at once', hint: 'Each video is fetched in pieces; this is how many come at once. More can be faster.' },
  startTimeoutSeconds: { label: 'Give up on a slow start after (seconds)', hint: 'How long a download may take to start before it is stopped.' },
  cookieSource:        {
    label: "Use my browser's YouTube login",
    hint:  'Off reads nothing from your browsers. Pick one to use its login for age-restricted or private videos; All tries each installed browser.',
  },
  saveNotFound: {
    label: 'List songs with no official video (CSV)',
    hint:  'Only matters when Download Official Music Video is set to Only: keeps a CSV list of the songs no official video was found for.',
  },
  createLogFile:   { label: 'Create Log File', hint: 'Write a log of what the app did, which helps to find out what went wrong.' },
  logDir:          { label: 'Log File Location', hint: 'The folder the log is written to.' },
  checkForUpdates: { label: 'Check for Updates', hint: 'Once a day, ask whether a newer MVD is out. Nothing is downloaded until you say Update now.' },
  signIn:          {
    label: 'Sign in to YouTube…',
    hint:  'Opens a window to sign in once. With a Premium account the music downloads at a higher quality. Then pick MVD sign-in in the setting above.',
  },
  move:      { label: 'Move MVD to its own folder…', hint: 'Puts MVD in its own folder and starts it again from there.' },
  uninstall: { label: 'Uninstall MVD…', hint: 'Removes MVD from this computer, after asking.' },
} satisfies Record<string, FieldText>

/** How the choices that are written in lower case read. */
export const choiceLabels: Record<string, string> = {
  mvd:  'MVD sign-in',
  webm: 'WebM',
  mp4:  'MP4',
  mkv:  'MKV',
  yes:  'Yes',
  no:   'No',
  only: 'Only',
}

/**
 * How a choice reads: a known name, else the choice with its first letter in capitals.
 *
 * @param choice - the value kept in the settings.
 */
export function choiceLabel (choice: string): string {
  return choiceLabels[choice] ?? choice.charAt(0).toUpperCase() + choice.slice(1)
}

/**
 * The label of the sign-in button, with what the last sign-in came to.
 *
 * @param state - `premium`, `free`, `none`, or anything else for no news.
 */
export function signInLabel (state: string): string {
  switch (state) {
    case 'premium': {
      return 'Sign in to YouTube… (signed in, Premium)'
    }
    case 'free': {
      return 'Sign in to YouTube… (signed in, not Premium)'
    }
    case 'none': {
      return 'Sign in to YouTube… (no login found)'
    }
    default: {
      return 'Sign in to YouTube…'
    }
  }
}
