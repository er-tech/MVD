import { describe, expect, it } from 'vitest'
import { exampleName, formatTemplate, moveSegment, parseTemplate, removeSegment } from './template.algorithm.ts'

const artistTitle = '%(artist,uploader)s - %(title)s.%(ext)s'

describe('parseTemplate and formatTemplate', () => {
  it('split the template into blocks and text, and make it again', () => {
    const segments = parseTemplate(artistTitle)
    expect(segments).toEqual([
      { kind: 'block', token: '%(artist,uploader)s', label: 'ARTIST' },
      { kind: 'text', text: ' - ' },
      { kind: 'block', token: '%(title)s', label: 'TITLE' },
    ])
    expect(formatTemplate(segments)).toBe(artistTitle)
  })

  it('name a block the palette does not know after its first field', () => {
    expect(parseTemplate('%(upload_date)s.%(ext)s')).toEqual([{ kind: 'block', token: '%(upload_date)s', label: 'UPLOAD DATE' }])
  })

  it('keep a folder written in the template as text', () => {
    const segments = parseTemplate('%(playlist_title,playlist)s/%(playlist_index)02d. %(title)s.%(ext)s')
    expect(segments.map(segment => segment.kind)).toEqual(['block', 'text', 'block', 'text', 'block'])
    expect(formatTemplate(segments)).toBe('%(playlist_title,playlist)s/%(playlist_index)02d. %(title)s.%(ext)s')
  })

  it('end every template with the extension, also one that had none', () => {
    expect(formatTemplate(parseTemplate('%(title)s'))).toBe('%(title)s.%(ext)s')
    expect(formatTemplate([])).toBe('.%(ext)s')
  })
})

describe('moveSegment', () => {
  const [artist, dash, title] = parseTemplate(artistTitle)

  it('moves a piece forward and backward, counting boundaries before the move', () => {
    expect(moveSegment([artist, dash, title], 0, 3)).toEqual([dash, title, artist])
    expect(moveSegment([artist, dash, title], 2, 0)).toEqual([title, artist, dash])
    expect(moveSegment([artist, dash, title], 0, 2)).toEqual([dash, artist, title])
  })

  it('changes nothing when the piece would stay where it is or the place does not exist', () => {
    const list = [artist, dash, title]
    expect(moveSegment(list, 1, 1)).toBe(list)
    expect(moveSegment(list, 1, 2)).toBe(list)
    expect(moveSegment(list, 5, 0)).toBe(list)
    expect(moveSegment(list, 0, 9)).toBe(list)
  })
})

describe('removeSegment', () => {
  it('takes a piece out, and leaves the list when there is no such piece', () => {
    const list = parseTemplate(artistTitle)
    expect(removeSegment(list, 1)).toHaveLength(2)
    expect(removeSegment(list, 7)).toBe(list)
  })
})

describe('exampleName', () => {
  it('shows what the pattern makes for a sample song', () => {
    expect(exampleName(artistTitle, 'mp4')).toBe('Double You - Part Time Lover.mp4')
  })

  it('pads an index and reads NA for a field the sample lacks', () => {
    expect(exampleName('%(playlist_index)02d %(nothing)s.%(ext)s', 'mkv')).toBe('10 NA.mkv')
    expect(exampleName('%(playlist_index)05d', 'mp4')).toBe('00010')
  })
})
