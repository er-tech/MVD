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
  /** Make the modal as tall as the window, with the same space above and below. */
  fill?:    boolean
}

/**
 * The frame every modal of the page shares: a backdrop, a title, a body and a footer.
 *
 * @param props - see {@link ModalFrameProps}.
 * @returns the dialog, drawn in a portal.
 */
export function ModalFrame ({ open, onClose, title, children, footer, size = 'md', fill = false }: ModalFrameProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={event => {
        if (!event.open) onClose()
      }}
      size={size}
      scrollBehavior='inside'
      placement={fill ? 'center' : undefined}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content h={fill ? 'calc(100dvh - 8rem)' : undefined} maxH={fill ? 'none' : undefined}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display={fill ? 'flex' : undefined} flexDirection='column' minH='0'>{children}</Dialog.Body>
            {footer !== undefined && <Dialog.Footer>{footer}</Dialog.Footer>}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
