export type CameraMode = 'firstPerson'

export type PlayerStartPosition = [number, number, number]

export type DirectionalInput = {
  x: number
  y: number
}

export type GameStoreState = {
  gameStarted: boolean
  playerStartPosition: PlayerStartPosition
  cameraMode: CameraMode
  pointerLocked: boolean
  torchEnabled: boolean
  ambientLightEnabled: boolean
  mobileMove: DirectionalInput
  mobileLook: DirectionalInput
  sitting: boolean
  canSit: boolean
}
