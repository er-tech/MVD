import { Box, Button, HStack, Input, Text } from '@chakra-ui/react'
import { Reorder, motion } from 'motion/react'
import { Fragment, useRef, useState } from 'react'
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

/** What a block looks like, in the pattern and in the bucket, so a block does not change as it moves between them. */
const blockLook = { px: '2', py: '0.5', borderRadius: 'sm', bg: 'blue.600', color: 'white', gap: '1' } as const

/** The place a block from the bucket takes while it is dragged over the pattern: it has the size of the piece it makes. */
function Ghost ({ block }: { block: TemplateBlock }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.55, scale: 1 }} style={{ flexShrink: 0 }}>
      <HStack {...blockLook} outline='1px dashed' outlineColor='blue.300'>
        <Text fontSize='sm' fontWeight='semibold' userSelect='none'>{block.label}</Text>
      </HStack>
    </motion.div>
  )
}

/**
 * One button that adds a block. Press it to add the block at the end, or drag it into the pattern: the pieces make
 * room where it would go, and it is added there when it is dropped. It looks like the piece it makes, follows the
 * pointer and goes back to its place afterwards.
 */
function BlockButton ({ block, onAdd, onStart, onMove, onEnd }: {
  block:   TemplateBlock
  onAdd:   () => void
  onStart: () => void
  onMove:  (x: number, y: number) => void
  onEnd:   (x: number, y: number) => void
}) {
  const draggedRef = useRef(false)

  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.1, zIndex: 30, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)', cursor: 'grabbing' }}
      style={{ position: 'relative', borderRadius: 4 }}
      onDragStart={() => {
        draggedRef.current = true
        onStart()
      }}
      onDrag={(event, info) => {
        onMove(pointerX(event) ?? info.point.x, pointerY(event) ?? info.point.y)
      }}
      onDragEnd={(event, info) => {
        onEnd(pointerX(event) ?? info.point.x, pointerY(event) ?? info.point.y)
        // The click that ends a drag comes after this, and must not add a second block.
        setTimeout(() => {
          draggedRef.current = false
        }, 0)
      }}
    >
      <HStack
        as='button'
        {...blockLook}
        cursor='grab'
        onClick={() => {
          if (!draggedRef.current) onAdd()
        }}
      >
        <Text fontSize='sm' fontWeight='semibold' userSelect='none'>{`+ ${block.label}`}</Text>
      </HStack>
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
  // While a block from the bucket is dragged: where it would go, and the middle of each piece before it made room.
  const [preview, setPreview] = useState<{ at: number, block: TemplateBlock } | undefined>()
  const middlesRef = useRef<number[]>([])

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
  const startBlock = () => {
    middlesRef.current = [...patternRef.current?.querySelectorAll('[data-piece]') ?? []].map(element => {
      const box = element.getBoundingClientRect()

      return box.left + box.width / 2
    })
  }
  const inPattern = (x: number, y: number) => {
    const area = patternRef.current?.getBoundingClientRect()

    return area !== undefined && x >= area.left && x <= area.right && y >= area.top && y <= area.bottom
  }
  const moveBlock = (block: TemplateBlock, x: number, y: number) => {
    const at = inPattern(x, y) ? boundaryAtX(x, middlesRef.current) : undefined
    setPreview(previous => previous?.at === at && previous?.block === block ? previous : (at === undefined ? undefined : { at, block }))
  }
  const endBlock = (block: TemplateBlock, x: number, y: number) => {
    setPreview(undefined)
    if (inPattern(x, y)) {
      addAt({ kind: 'block', token: block.token, label: block.label }, boundaryAtX(x, middlesRef.current))
    }
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
        {[...pieces, undefined].map((piece, index) => (
          <Fragment key={piece?.id ?? 'end'}>
            {preview?.at === index && <Ghost block={preview.block} />}
            {piece !== undefined && (
              <Reorder.Item
                as='div'
                value={piece}
                data-piece=''
                data-testid={`piece-${String(index)}`}
                layout
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
            )}
          </Fragment>
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
            onStart={startBlock}
            onMove={(x, y) => {
              moveBlock(block, x, y)
            }}
            onEnd={(x, y) => {
              endBlock(block, x, y)
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
