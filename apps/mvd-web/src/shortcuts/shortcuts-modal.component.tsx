import { Button, Kbd, Table } from '@chakra-ui/react'
import { ModalFrame } from '../modalframe'
import { itemShortcutList, shortcutList } from './shortcut-list.content.ts'

/** The props of {@link ShortcutsModal}. */
export interface ShortcutsModalProps {
  /** Whether the modal is shown. */
  open:    boolean
  /** Called when the modal closes. */
  onClose: () => void
}

/**
 * The window that lists the keyboard shortcuts.
 *
 * @param props - see {@link ShortcutsModalProps}.
 * @returns the modal.
 */
export function ShortcutsModal ({ open, onClose }: ShortcutsModalProps) {
  return (
    <ModalFrame open={open} onClose={onClose} title='Keyboard shortcuts' footer={<Button onClick={onClose}>Close</Button>}>
      <Table.Root size='sm'>
        <Table.Body>
          {shortcutList.map(shortcut => (
            <Table.Row key={shortcut.action}>
              <Table.Cell>{shortcut.label}</Table.Cell>
              <Table.Cell textAlign='end'><Kbd>{shortcut.keys}</Kbd></Table.Cell>
            </Table.Row>
          ))}
          {itemShortcutList.map(shortcut => (
            <Table.Row key={shortcut.keys}>
              <Table.Cell>{shortcut.label}</Table.Cell>
              <Table.Cell textAlign='end'><Kbd>{shortcut.keys}</Kbd></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </ModalFrame>
  )
}
