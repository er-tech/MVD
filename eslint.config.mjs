// The rules come from @monosmith/eslint-config; the blocks below are this repository's own.
import monosmith from '@monosmith/eslint-config'

export default [
  ...monosmith({
    workspaceRoot: import.meta.dirname,
    verticalSlices: { files: ['apps/mvd-web/src/**/*.{ts,tsx}'], roles: ['hook', 'content', 'mock'] },
  }),
  {
    // A yt-dlp metadata dump saved as UTF-16 by PowerShell: ESLint cannot parse it as JSON.
    // Delete it and this block when nothing needs the file.
    name:    'local/utf16-metadata-dump',
    ignores: ['test_meta.json'],
  },
  {
    ignores: [
      '**/vite.config.*.timestamp*',
    ],
  },
  {
    // The page built by apps/mvd-web and copied in for go:embed, and the bindings `wails build`
    // writes for the page. Both are generated and git-ignored.
    name:    'local/generated-web',
    ignores: ['apps/mvd/frontend/dist/**', 'apps/mvd-web/src/wailsjs/**'],
  },
]
