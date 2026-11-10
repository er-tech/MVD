import { Spinner, Tag } from '@chakra-ui/react'
import type { Song } from '../library'
import { audioLook, progressLabels, progressOf, progressPalette, qualityOf, tonePalette, versionLook } from './song-tags.algorithm.ts'

function Pill ({ palette, children }: { palette: string, children: React.ReactNode }) {
  return (
    <Tag.Root colorPalette={palette} size='sm' variant='subtle' maxW='full'>
      <Tag.Label>{children}</Tag.Label>
    </Tag.Root>
  )
}

/** The statuses of a song a worker is busy with now, the only ones that show a spinner. */
const busyStatuses = new Set(['naming', 'picking'])

/** The status of a song as a tag coloured by its tone, with a spinner only while a worker is naming or picking it. */
export function StatusTag ({ song }: { song: Pick<Song, 'status' | 'tone'> }) {
  if (song.status === '') {
    return null
  }

  return (
    <Pill palette={song.status === 'picking' ? 'teal' : tonePalette[song.tone]}>
      {busyStatuses.has(song.status) && <Spinner size='xs' me='1' aria-label={song.status === 'naming' ? 'Naming the song' : 'Looking for the video'} />}
      {song.status}
    </Pill>
  )
}

/** The version of a song (official, best quality, original) as a tag, nothing while it is not known. */
export function VersionTag ({ song }: { song: Pick<Song, 'version'> }) {
  const look = versionLook(song.version)

  return look === undefined ? null : <Pill palette={look.palette}>{look.label}</Pill>
}

/** How far a song is as a tag, with the percent while it downloads. */
export function ProgressTag ({ song }: { song: Pick<Song, 'status' | 'percent'> }) {
  const state = progressOf(song)
  const percent = state === 'downloading' && song.percent > 0 ? ` ${String(Math.round(song.percent))}%` : ''

  return <Pill palette={progressPalette[state]}>{`${progressLabels[state]}${percent}`}</Pill>
}

/** The quality of the file of a song as a tag, nothing while it is not known. */
export function QualityTag ({ song }: { song: Pick<Song, 'height' | 'audioKbps'> }) {
  const quality = qualityOf(song)

  return quality === '' ? null : <Pill palette='cyan'>{quality}</Pill>
}

/** The best audio step of a song as a tag, with a spinner while it is fetched, nothing when the song has none. */
export function AudioTag ({ song }: { song: Pick<Song, 'audio' | 'audioKbps'> }) {
  const look = audioLook(song.audio, song.audioKbps)

  return look === undefined
    ? null
    : (
        <Pill palette={look.palette}>
          {song.audio === 'fetching' && <Spinner size='xs' me='1' aria-label='Fetching the best audio' />}
          {look.label}
        </Pill>
      )
}
