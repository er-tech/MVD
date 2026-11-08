import { ChakraProvider, defaultSystem, Flex, Heading } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { MetricsBar, usePageMetrics } from '../metrics'
import { RowsStore } from '../rowstore'
import { connectRows } from '../rowsync'
import { SongTable } from '../songtable'

/**
 * The window: the songs kept the same as the Go side, and the page's own measures.
 *
 * @param props.backend - the Go side.
 */
export function App ({ backend }: { backend: Backend }) {
  const [store] = useState(() => new RowsStore())
  const metrics = usePageMetrics(backend)
  useEffect(() => connectRows(backend, store), [backend, store])

  return (
    <ChakraProvider value={defaultSystem}>
      <Flex direction='column' h='100vh'>
        <Flex align='baseline' justify='space-between' px='3' py='2' borderBottomWidth='1px'>
          <Heading size='md'>MVD</Heading>
          <MetricsBar metrics={metrics} />
        </Flex>
        <SongTable store={store} />
      </Flex>
    </ChakraProvider>
  )
}
