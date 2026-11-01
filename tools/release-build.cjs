#!/usr/bin/env node
// Makes the release files of the desktop app on this runner. smith runs it once per platform
// after a release, with SMITH_VERSION set: the zip everywhere, and on a Mac the disk image too.
// The files land in dist/drop, named by tools/release-assets.cjs.
//
// Each task clears dist/drop (its output folder) before it runs, so the files of one task are
// copied aside and put back together when all tasks are done.
'use strict'
const { spawnSync } = require('node:child_process')
const { cpSync, mkdirSync, readdirSync, existsSync } = require('node:fs')
const { join } = require('node:path')

const DROP = join('dist', 'drop')
const KEPT = join('dist', 'release-files')
const env = { ...process.env, VERSION: process.env.SMITH_VERSION }

function run (command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// The native build of the Linux app needs GTK and WebKitGTK, which a fresh runner does not have.
if (process.platform === 'linux') {
  run('sudo', ['apt-get', 'update'])
  run('sudo', ['apt-get', 'install', '-y', 'gcc', 'pkg-config', 'libgtk-3-dev', 'libwebkit2gtk-4.1-dev'])
}

mkdirSync(KEPT, { recursive: true })
const tasks = process.platform === 'darwin' ? ['package-native', 'package-dmg'] : ['package-native']
for (const task of tasks) {
  run('smith', ['run', task, '-p', 'mvd'])
  if (existsSync(DROP)) {
    for (const file of readdirSync(DROP)) cpSync(join(DROP, file), join(KEPT, file), { recursive: true })
  }
}
mkdirSync(DROP, { recursive: true })
for (const file of readdirSync(KEPT)) cpSync(join(KEPT, file), join(DROP, file), { recursive: true })
