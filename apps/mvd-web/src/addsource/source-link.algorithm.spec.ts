import { describe, expect, it } from 'vitest'
import { sourceLinks, textOf } from './source-link.algorithm.ts'

const data = (types: Record<string, string>) => ({ getData: (type: string) => types[type] ?? '' })

describe('sourceLinks', () => {
  it('keeps the YouTube links, one for each, in order', () => {
    const text = 'look https://www.youtube.com/playlist?list=PL1 and\nhttps://youtu.be/abc https://www.youtube.com/playlist?list=PL1'
    expect(sourceLinks(text)).toEqual(['https://www.youtube.com/playlist?list=PL1', 'https://youtu.be/abc'])
  })

  it('takes the music site and a link without www', () => {
    expect(sourceLinks('https://music.youtube.com/playlist?list=OLAK https://youtube.com/watch?v=1')).toHaveLength(2)
  })

  it('refuses other sites, other protocols and plain words', () => {
    expect(sourceLinks('https://example.com/watch?v=1 ftp://youtube.com/x youtube.com hello')).toEqual([])
  })
})

describe('textOf', () => {
  it('prefers the address list of a browser drag and skips its comments', () => {
    expect(textOf(data({ 'text/uri-list': '# note\r\nhttps://youtu.be/a', 'text/plain': 'a page title' }))).toBe('https://youtu.be/a')
  })

  it('falls back to the plain text', () => {
    expect(textOf(data({ 'text/plain': 'https://youtu.be/a' }))).toBe('https://youtu.be/a')
  })
})
