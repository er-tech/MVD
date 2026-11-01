// The rules come from @monosmith/eslint-config; the blocks below are this repository's own.
import monosmith from '@monosmith/eslint-config'

export default [
  ...monosmith({
    workspaceRoot: import.meta.dirname,
    verticalSlices: { files: ['apps/mvd-web/src/**/*.{ts,tsx}'], roles: ['hook', 'content'] },
  }),
  {
    // A yt-dlp metadata dump saved as UTF-16 by PowerShell: ESLint cannot parse it as JSON.
    // Delete it and this block when nothing needs the file.
    name:    'local/utf16-metadata-dump',
    ignores: ['test_meta.json'],
  },
  {
    // The classic themes set their tokens (custom properties) on :root[data-theme=...] in
    // apps/mvd-web/src/classic-themes; the components' stylesheets in other files read them, so
    // the linter cannot see where they are defined.
    name:  'local/classic-theme-tokens',
    files: [
      'apps/mvd-web/src/classic-*/**/*.css',
      'apps/mvd-web/src/add-music-window/**/*.css',
      'apps/mvd-web/src/theme-preview/**/*.css',
      'apps/mvd-web/src/classic-app/**/*.css',
      'apps/mvd-web/src/preferences-window/**/*.css',
    ],
    rules: {
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
    },
  },
  {
    ignores: [
      '**/vite.config.*.timestamp*',
    ],
  },
  {
    // The React build that stage-web copies in for go:embed. Generated, and git-ignored.
    name:    'local/staged-web-build',
    ignores: ['apps/mvd/localserver/web/**'],
  },
]
