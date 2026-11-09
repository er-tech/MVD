import { Box, Button, HStack, Input, Text } from '@chakra-ui/react'
import { Reorder, motion } from 'motion/react'
import { useRef, useState } from 'react'
import {
  boundaryAtX, exampleName, extensionSuffix, formatTemplate, insertSegment, parseTemplate, removeSegment, templateBlocks,
} from './template.algorithm.ts'
import type { Segment, TemplateBlock } from './template.algorithm.ts'

/** The props of {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** The yt-dlp output template as it is kept. */
  value:    string
  /** Called with the new template when the person changes the pattern. */
  onChange: (template: string) => void
}

/** A piece with the identity that lets the animation follow it as it moves. */
interface Piece {
  id:      number
  segment: Segment
}

const segmentName = (segment: Segment) => segment.kind === 'block' ? segment.label : `"${segment.text}"`

let lastId = 0
const withIds = (segments: Segment[]): Piece[] => segments.map(segment => ({ id: ++lastId, segment }))
const templateOf = (pieces: Piece[]) => formatTemplate(pieces.map(piece => piece.segment))

/** The cursor position of a pointer event that ended a drag. */
const pointerX = (event: MouseEvent | TouchEvent | PointerEvent): number | undefined =>
  'clientX' in event ? event.clientX : event.changedTouches[0]?.clientX

/** The vertical position of a pointer event that ended a drag. */
const pointerY = (event: MouseEvent | TouchEvent | PointerEvent): number | undefined =>
  'clientY' in event ? event.clientY : event.changedTouches[0]?.clientY

/**
 * One button that adds a block. Press it to add the block at the end, or drag it into the pattern to
 * add it where it is dropped; it follows the pointer and goes back to its place afterwards.
 */
function BlockButton ({ block, onAdd, onDropAt }: {
  block:    TemplateBlock
  onAdd:    () => void
  onDropAt: (x: number, y: number) => void
}) {
  const draggedRef = useRef(false)

  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.08, zIndex: 30, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)', cursor: 'grabbing' }}
      style={{ position: 'relative', borderRadius: 6 }}
      onDragStart={() => {
        draggedRef.current = true
      }}
      onDragEnd={(event, info) => {
        const x = pointerX(event) ?? info.point.x
        const y = pointerY(event) ?? info.point.y
        onDropAt(x, y)
        // The click that ends a drag comes after this, and must not add a second block.
        setTimeout(() => {
          draggedRef.current = false
        }, 0)
      }}
    >
      <Button
        size='sm'
        variant='outline'
        cursor='grab'
        onClick={() => {
          if (!draggedRef.current) onAdd()
        }}
      >
        {`+ ${block.label}`}
      </Button>
    </motion.div>
  )
}

/**
 * The editor of the file name pattern: the pattern is shown as blocks, each a field of the song, with
 * the text typed between them. Drag a piece to move it, press its × to take it out, and add a block by
 * pressing its button or by dragging it into the pattern. An example name shows what the pattern makes.
 *
 * @param props - see {@link TemplateEditorProps}.
 */
export function TemplateEditor ({ value, onChange }: TemplateEditorProps) {
  const [pieces, setPieces] = useState(() => withIds(parseTemplate(value)))
  // The template the pieces stand for: when `value` differs the page changed it, and the pieces are made again.
  const [known, setKnown] = useState(value)
  const [text, setText] = useState('')
  const patternRef = useRef<HTMLDivElement>(null)

  if (value !== known) {
    setKnown(value)
    setPieces(withIds(parseTemplate(value)))
  }

  const commit = (next: Piece[]) => {
    setPieces(next)
    const template = templateOf(next)
    setKnown(template)
    onChange(template)
  }
  const addAt = (segment: Segment, at: number) => {
    const next = insertSegment(pieces.map(piece => piece.segment), segment, at)
    commit(withIds(next))
  }
  const addText = () => {
    if (text === '') return
    addAt({ kind: 'text', text }, pieces.length)
    setText('')
  }
  const dropBlock = (block: TemplateBlock, x: number, y: number) => {
    const area = patternRef.current?.getBoundingClientRect()
    if (area === undefined || x < area.left || x > area.right || y < area.top || y > area.bottom) return
    const middles = [...patternRef.current?.querySelectorAll('[data-piece]') ?? []].map(element => {
      const box = element.getBoundingClientRect()

      return box.left + box.width / 2
    })
    addAt({ kind: 'block', token: block.token, label: block.label }, boundaryAtX(x, middles))
  }

  return (
    <Box>
      <Reorder.Group
        as='div'
        axis='x'
        values={pieces}
        onReorder={setPieces}
        ref={patternRef}
        data-testid='template-pattern'
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          minHeight:    44,
          padding:      '6px 8px',
          overflowX:    'auto',
          border:       '1px solid var(--chakra-colors-border)',
          borderRadius: 6,
          listStyle:    'none',
        }}
      >
        {pieces.map((piece, index) => (
          <Reorder.Item
            key={piece.id}
            as='div'
            value={piece}
            data-piece=''
            data-testid={`piece-${String(index)}`}
            whileDrag={{ scale: 1.1, zIndex: 20, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)', cursor: 'grabbing' }}
            style={{ position: 'relative', borderRadius: 4, cursor: 'grab', flexShrink: 0 }}
            onDragEnd={() => {
              if (templateOf(pieces) !== known) commit(pieces)
            }}
          >
            <HStack
              gap='1'
              px='2'
              py='0.5'
              borderRadius='sm'
              bg={piece.segment.kind === 'block' ? 'blue.600' : 'bg.muted'}
              color={piece.segment.kind === 'block' ? 'white' : 'inherit'}
            >
              <Text fontSize='sm' fontWeight='semibold' userSelect='none'>
                {piece.segment.kind === 'block' ? piece.segment.label : piece.segment.text}
              </Text>
              <Box
                as='button'
                aria-label={`Remove ${segmentName(piece.segment)}`}
                onPointerDownCapture={event => {
                  // A press on the × is a click, never the start of a drag.
                  event.stopPropagation()
                }}
                onClick={() => {
                  const next = removeSegment(pieces.map(each => each.segment), index)
                  commit(withIds(next))
                }}
              >
                ×
              </Box>
            </HStack>
          </Reorder.Item>
        ))}
        <Text fontSize='sm' color='fg.muted' flexShrink={0}>{extensionSuffix.replace('%(ext)s', 'ext')}</Text>
      </Reorder.Group>

      <HStack mt='3' wrap='wrap'>
        {templateBlocks.map(block => (
          <BlockButton
            key={block.token}
            block={block}
            onAdd={() => {
              addAt({ kind: 'block', token: block.token, label: block.label }, pieces.length)
            }}
            onDropAt={(x, y) => {
              dropBlock(block, x, y)
            }}
          />
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
