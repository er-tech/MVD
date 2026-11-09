import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TemplateEditor } from './template-editor.component.tsx'

afterEach(cleanup)

const artistTitle = '%(artist,uploader)s - %(title)s.%(ext)s'

const shown = () => {
  const onChange = vi.fn()
  render(
    <ChakraProvider value={defaultSystem}>
      <TemplateEditor value={artistTitle} onChange={onChange} />
    </ChakraProvider>,
  )

  return onChange
}

describe('TemplateEditor', () => {
  it('shows the pattern as blocks and text, and an example name', () => {
    shown()
    expect(screen.getByText('ARTIST')).toBeTruthy()
    expect(screen.getByText('TITLE')).toBeTruthy()
    expect(screen.getByText('Example: Double You - Part Time Lover.mp4')).toBeTruthy()
  })

  it('adds a block at the end of the pattern', () => {
    const onChange = shown()
    fireEvent.click(screen.getByRole('button', { name: '+ PLAYLIST NAME' }))
    expect(onChange).toHaveBeenCalledWith('%(artist,uploader)s - %(title)s%(playlist_title,playlist)s.%(ext)s')
  })

  it('adds the text typed, and only when there is some', () => {
    const onChange = shown()
    const add = screen.getByRole<HTMLButtonElement>('button', { name: '+ Text' })
    expect(add.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Text to add'), { target: { value: ' (HD)' } })
    fireEvent.click(add)
    expect(onChange).toHaveBeenCalledWith('%(artist,uploader)s - %(title)s (HD).%(ext)s')
  })

  it('takes a piece out with its ×', () => {
    const onChange = shown()
    fireEvent.click(screen.getByRole('button', { name: 'Remove ARTIST' }))
    expect(onChange).toHaveBeenCalledWith(' - %(title)s.%(ext)s')
  })

  it('makes every piece draggable, in the order of the pattern', () => {
    shown()
    const pieces = screen.getAllByTestId(/^piece-/)
    expect(pieces.map(piece => piece.textContent)).toEqual(['ARTIST×', ' - ×', 'TITLE×'])
  })

  it('shows a new pattern the page sets', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ChakraProvider value={defaultSystem}>
        <TemplateEditor value={artistTitle} onChange={onChange} />
      </ChakraProvider>,
    )
    rerender(
      <ChakraProvider value={defaultSystem}>
        <TemplateEditor value='%(title)s.%(ext)s' onChange={onChange} />
      </ChakraProvider>,
    )
    expect(screen.getAllByTestId(/^piece-/)).toHaveLength(1)
  })
})
