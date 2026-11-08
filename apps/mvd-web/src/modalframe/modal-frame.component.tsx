import { Dialog, Portal } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** The props of {@link ModalFrame}. */
export interface ModalFrameProps {
  /** Whether the modal is shown. */
  open:     boolean
  /** Called when the person asks to close: Escape, a click on the backdrop or the close button. */
  onClose:  () => void
  /** The heading of the modal. */
  title:    string
  /** The body of the modal. */
  children: ReactNode
  /** The buttons at the bottom of the modal. */
  footer?:  ReactNode
  /** The width of the modal. Defaults to `md`. */
  size?:    'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * The frame every modal of the page shares: a backdrop, a title, a body and a footer.
 *
 * @param props - see {@link ModalFrameProps}.
 * @returns the dialog, drawn in a portal.
 */
export function ModalFrame ({ open, onClose, title, children, footer, size = 'md' }: ModalFrameProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={event => {
        if (!event.open) onClose()
      }}
      size={size}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{children}</Dialog.Body>
            {footer !== undefined && <Dialog.Footer>{footer}</Dialog.Footer>}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
