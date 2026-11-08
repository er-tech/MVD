import { Box, Button, HStack, Input, Text } from '@chakra-ui/react'
import { useState } from 'react'
import {
  exampleName, extensionSuffix, formatTemplate, moveSegment, parseTemplate, removeSegment, templateBlocks,
} from './template.algorithm.ts'
import type { Segment } from './template.algorithm.ts'

/** The props of {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** The yt-dlp output template as it is kept. */
  value:    string
  /** Called with the new template when the person changes the pattern. */
  onChange: (template: string) => void
}

const segmentName = (segment: Segment) => segment.kind === 'block' ? segment.label : `"${segment.text}"`

/**
 * The editor of the file name pattern: the pattern is shown as blocks, each a field of the song, with
 * the text typed between them. Drag a piece to move it, press its × to take it out, and add blocks or
 * text with the buttons below. An example name shows what the pattern makes.
 *
 * @param props - see {@link TemplateEditorProps}.
 */
export function TemplateEditor ({ value, onChange }: TemplateEditorProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [text, setText] = useState('')
  const segments = parseTemplate(value)

  const change = (next: Segment[]) => {
    onChange(formatTemplate(next))
  }
  const endDrag = () => {
    setDragFrom(null)
    setOver(null)
  }
  const dropAt = (boundary: number) => {
    if (dragFrom !== null) change(moveSegment(segments, dragFrom, boundary))
    endDrag()
  }
  const addText = () => {
    if (text === '') return
    change([...segments, { kind: 'text', text }])
    setText('')
  }

  const dropZone = (boundary: number) => (
    <Box
      key={`zone-${boundary}`}
      data-testid={`drop-${boundary}`}
      alignSelf='stretch'
      minW={over === boundary ? '4' : '1'}
      bg={over === boundary ? 'blue.500' : 'transparent'}
      borderRadius='sm'
      onDragOver={event => {
        event.preventDefault()
        setOver(boundary)
      }}
      onDragLeave={() => {
        setOver(null)
      }}
      onDrop={event => {
        event.preventDefault()
        dropAt(boundary)
      }}
    />
  )

  return (
    <Box>
      <HStack
        data-testid='template-pattern'
        gap='0'
        wrap='wrap'
        borderWidth='1px'
        borderRadius='md'
        px='2'
        py='1.5'
        minH='10'
      >
        {segments.map((segment, index) => (
          <HStack key={`segment-${String(index)}`} gap='0'>
            {dropZone(index)}
            <HStack
              data-testid={`piece-${String(index)}`}
              draggable
              gap='1'
              px='2'
              py='0.5'
              borderRadius='sm'
              cursor='grab'
              bg={segment.kind === 'block' ? 'blue.600' : 'bg.muted'}
              color={segment.kind === 'block' ? 'white' : 'inherit'}
              opacity={dragFrom === index ? 0.4 : 1}
              onDragStart={event => {
                setDragFrom(index)
                event.dataTransfer?.setData('text/plain', segmentName(segment))
              }}
              onDragEnd={endDrag}
            >
              <Text fontSize='sm' fontWeight='semibold'>{segment.kind === 'block' ? segment.label : segment.text}</Text>
              <Box
                as='button'
                aria-label={`Remove ${segmentName(segment)}`}
                onClick={() => {
                  change(removeSegment(segments, index))
                }}
              >
                ×
              </Box>
            </HStack>
          </HStack>
        ))}
        {dropZone(segments.length)}
        <Text fontSize='sm' color='fg.muted'>{extensionSuffix.replace('%(ext)s', 'ext')}</Text>
      </HStack>

      <HStack mt='3' wrap='wrap'>
        {templateBlocks.map(block => (
          <Button
            key={block.token}
            size='sm'
            variant='outline'
            onClick={() => {
              change([...segments, { kind: 'block', token: block.token, label: block.label }])
            }}
          >
            {`+ ${block.label}`}
          </Button>
        ))}
        <Input
          size='sm'
          w='32'
          placeholder='text'
          aria-label='Text to add'
          value={text}
          onChange={event => {
            setText(event.target.value)
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') addText()
          }}
        />
        <Button size='sm' variant='outline' disabled={text === ''} onClick={addText}>+ Text</Button>
      </HStack>
      <Text mt='2' fontSize='sm' color='fg.muted'>{`Example: ${exampleName(value, 'mp4')}`}</Text>
    </Box>
  )
}
