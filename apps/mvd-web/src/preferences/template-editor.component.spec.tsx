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

  it('moves a block to where it is dropped', () => {
    const onChange = shown()
    fireEvent.dragStart(screen.getByTestId('piece-0'))
    fireEvent.dragOver(screen.getByTestId('drop-3'))
    fireEvent.drop(screen.getByTestId('drop-3'))
    expect(onChange).toHaveBeenCalledWith(' - %(title)s%(artist,uploader)s.%(ext)s')
  })

  it('changes nothing when a piece is dropped where it already is', () => {
    const onChange = shown()
    fireEvent.dragStart(screen.getByTestId('piece-1'))
    fireEvent.drop(screen.getByTestId('drop-2'))
    expect(onChange).toHaveBeenCalledWith(artistTitle)
  })
})
