export type FrameMetrics = {
  readonly average: number
  readonly p95: number
  readonly p99: number
  readonly maximum: number
  readonly longFrames: number
  readonly samples: number
}

export type FrameSampleWindow = {
  cursor: number
  readonly values: number[]
}

const LONG_FRAME_MS = 1000 / 30

export function createFrameSampleWindow(): FrameSampleWindow {
  return { cursor: 0, values: [] }
}

/** Records a bounded sample without shifting the entire array after it fills. */
export function recordFrameTime(
  window: FrameSampleWindow,
  milliseconds: number,
  capacity = 600,
) {
  if (capacity <= 0) return
  if (window.values.length < capacity) {
    window.values.push(milliseconds)
    return
  }
  window.values[window.cursor] = milliseconds
  window.cursor = (window.cursor + 1) % capacity
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1)
  return sorted[index] ?? 0
}

/** Summarises a rolling window; percentiles expose hitches hidden by average FPS. */
export function summariseFrameTimes(frameTimes: readonly number[]): FrameMetrics {
  if (frameTimes.length === 0) {
    return { average: 0, p95: 0, p99: 0, maximum: 0, longFrames: 0, samples: 0 }
  }

  const sorted = [...frameTimes].sort((a, b) => a - b)
  const total = frameTimes.reduce((sum, value) => sum + value, 0)
  const round = (value: number) => Number(value.toFixed(1))

  return {
    average: round(total / frameTimes.length),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
    maximum: round(sorted.at(-1) ?? 0),
    longFrames: frameTimes.filter((value) => value > LONG_FRAME_MS).length,
    samples: frameTimes.length,
  }
}
