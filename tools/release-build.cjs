#!/usr/bin/env node
// Makes the release files of the desktop app on this runner. smith runs it once per platform
// after a release, with SMITH_VERSION set: the zip on Windows and Linux, and on a Mac the three disk images
// (universal, arm64, amd64) in place of a zip, since a zip of the bare program is no app.
// The files land in dist/drop, named by tools/release-assets.cjs. dist/drop is listed under
// [workspace] shared_outputs in smith.toml, so smith keeps it between the tasks.
'use strict'
const { spawnSync } = require('node:child_process')

const env = { ...process.env, VERSION: process.env.SMITH_VERSION }
const tasks = process.platform === 'darwin' ? ['package-dmg'] : ['package-native']
for (const task of tasks) {
  const run = spawnSync('smith', ['run', task, '-p', 'mvd'], { stdio: 'inherit', env, shell: true })
  if (run.status !== 0) process.exit(run.status ?? 1)
}
