/** What the person chose in the page: a source or a song. The details panel follows it. */
export interface Selection {
  kind: 'source' | 'song'
  id:   string
}
