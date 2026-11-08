import { Text } from '@chakra-ui/react'
import type { PageMetrics } from './use-page-metrics.hook.ts'

/**
 * One line with the page's own measures, for the prototype.
 *
 * @param props.metrics - the numbers of the last period.
 */
export function MetricsBar ({ metrics }: { metrics: PageMetrics }) {
  return (
    <Text fontSize='xs' color='fg.muted' data-testid='metrics'>
      long tasks {metrics.longTasks} (longest {metrics.longestMs} ms) · rows drawn {metrics.rowDraws}/s
    </Text>
  )
}
