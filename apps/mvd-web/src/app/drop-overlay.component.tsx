import { Center, Text } from '@chakra-ui/react'

/**
 * Covers the whole page while a file or a link is dragged over it. It lets the pointer through, so the
 * drop still lands on the window.
 */
export function DropOverlay () {
  return (
    <Center
      data-testid='drop-overlay'
      position='fixed'
      inset='0'
      zIndex='overlay'
      pointerEvents='none'
      bg='blackAlpha.700'
      borderWidth='4px'
      borderStyle='dashed'
      borderColor='blue.400'
    >
      <Text color='white' fontSize='3xl' fontWeight='semibold'>Drop to load</Text>
    </Center>
  )
}
