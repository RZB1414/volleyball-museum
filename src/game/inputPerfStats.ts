type InputPerfStats = {
  mouseMoveEvents: number
  pointerMoveEvents: number
  totalMovement: number
}

declare global {
  interface Window {
    __museumInputPerfStats?: InputPerfStats
  }
}

function getInputPerfStats() {
  window.__museumInputPerfStats ??= {
    mouseMoveEvents: 0,
    pointerMoveEvents: 0,
    totalMovement: 0,
  }

  return window.__museumInputPerfStats
}

function recordMovement(movementX: number, movementY: number) {
  getInputPerfStats().totalMovement += Math.abs(movementX) + Math.abs(movementY)
}

export function recordHandledMouseMove(movementX: number, movementY: number) {
  const stats = getInputPerfStats()
  stats.mouseMoveEvents += 1
  recordMovement(movementX, movementY)
}

export function recordHandledPointerMove(movementX: number, movementY: number) {
  const stats = getInputPerfStats()
  stats.pointerMoveEvents += 1
  recordMovement(movementX, movementY)
}

export function readAndResetInputPerfStats() {
  const stats = getInputPerfStats()
  const snapshot = { ...stats }

  stats.mouseMoveEvents = 0
  stats.pointerMoveEvents = 0
  stats.totalMovement = 0

  return snapshot
}
