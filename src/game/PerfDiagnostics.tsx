import { useEffect } from 'react'
import { readAndResetInputPerfStats } from './inputPerfStats'

// Temporary diagnostic. It logs Chrome long tasks and reads input counters from
// the real player controller, so enabling ?perf=1 does not add extra mouse work.
export function PerfDiagnostics() {
  useEffect(() => {
    let observer: PerformanceObserver | null = null

    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const inputStats = readAndResetInputPerfStats()

          console.warn(
            `[perf] long task: ${entry.duration.toFixed(1)}ms - handled mousemove events since last task: ${inputStats.mouseMoveEvents} - handled pointermove events since last task: ${inputStats.pointerMoveEvents} - total look movement: ${inputStats.totalMovement.toFixed(0)}`,
          )
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch {
      console.warn('[perf] longtask API is not supported in this browser')
    }

    return () => {
      observer?.disconnect()
    }
  }, [])

  return null
}
