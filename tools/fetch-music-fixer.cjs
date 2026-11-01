#!/usr/bin/env node
// Downloads Metil's music-fixer for this machine's GOOS/GOARCH into
// libs/mvd-core/musicfixer/bundle, where the Go build embeds it. Without a token or a
// release the build goes on without it, and the feature is off in that build.
'use strict'
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const REPO = 'er-tech/Metil'
// The release the bundle comes from. Metil's latest release is another product, so it is pinned.
const TAG = process.env.MUSIC_FIXER_TAG || 'music-fixer-v0.2.0'
const goenv = k => spawnSync('go', ['env', k], { encoding: 'utf8' }).stdout.trim()
// Metil names its files by system and processor, not by Go's GOOS and GOARCH.
const OS = new Map([['windows', 'windows'], ['darwin', 'macos'], ['linux', 'linux']])
const CPU = new Map([['amd64', 'x64'], ['arm64', 'arm64']])
const goName = `music-fixer-${goenv('GOOS')}-${goenv('GOARCH')}.zip`
const name = `music-fixer-${OS.get(goenv('GOOS'))}-${CPU.get(goenv('GOARCH'))}.zip`
const dir = join(__dirname, '..', 'libs', 'mvd-core', 'musicfixer', 'bundle')

function skip (why) {
  console.log(`fetch-music-fixer: ${why}, building without ${goName}`)
  process.exit(0)
}

if (!process.env.METIL_TOKEN) skip('no METIL_TOKEN')
if (!OS.has(goenv('GOOS')) || !CPU.has(goenv('GOARCH'))) skip('Metil has no music-fixer for this system')
mkdirSync(dir, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'music-fixer-'))
try {
  const r = spawnSync('gh', ['release', 'download', TAG, '-R', REPO, '-p', `${name}*`, '-D', work, '--clobber'], {
    stdio: 'inherit', env: { ...process.env, GH_TOKEN: process.env.METIL_TOKEN },
  })
  if (r.status !== 0) skip(`no ${name} in ${REPO} ${TAG}`)
  const want = readFileSync(join(work, `${name}.sha256`), 'utf8').trim().split(/\s+/, 1)[0].toLowerCase()
  const got = createHash('sha256').update(readFileSync(join(work, name))).digest('hex')
  if (got !== want) {
    console.error(`fetch-music-fixer: ${name} does not match its .sha256 (${got} is not ${want})`)
    process.exit(1)
  }
  copyFileSync(join(work, name), join(dir, goName))
  console.log(`fetch-music-fixer: ${name} (${TAG}) is in the bundle as ${goName}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
