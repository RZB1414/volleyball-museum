import { CuboidCollider, RigidBody } from '@react-three/rapier'

const room = {
  width: 12,
  depth: 16,
  height: 4,
  wallThickness: 0.35,
  playerWallInset: 1,
  playerBoundaryThickness: 0.1,
}

export function MuseumRoom() {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const halfHeight = room.height / 2
  const backWallDisplayZ = -halfDepth + room.wallThickness / 2 + 0.05
  const leftWallDisplayX = -halfWidth + room.wallThickness / 2 + 0.05
  const rightWallDisplayX = halfWidth - room.wallThickness / 2 - 0.05
  const interiorBackZ = -halfDepth + room.wallThickness / 2
  const interiorFrontZ = halfDepth - room.wallThickness / 2
  const interiorLeftX = -halfWidth + room.wallThickness / 2
  const interiorRightX = halfWidth - room.wallThickness / 2

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <boxGeometry args={[room.width, 0.1, room.depth]} />
          <meshStandardMaterial color="#a9a9a9" roughness={0.9} />
        </mesh>
        <CuboidCollider args={[halfWidth, 0.05, halfDepth]} position={[0, -0.05, 0]} />

        <mesh receiveShadow position={[0, halfHeight, -halfDepth]}>
          <boxGeometry args={[room.width, room.height, room.wallThickness]} />
          <meshStandardMaterial color="#8f9094" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[halfWidth, halfHeight, room.wallThickness / 2]}
          position={[0, halfHeight, -halfDepth]}
        />

        <mesh receiveShadow position={[0, halfHeight, halfDepth]}>
          <boxGeometry args={[room.width, room.height, room.wallThickness]} />
          <meshStandardMaterial color="#8c8d91" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[halfWidth, halfHeight, room.wallThickness / 2]}
          position={[0, halfHeight, halfDepth]}
        />

        <mesh receiveShadow position={[-halfWidth, halfHeight, 0]}>
          <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
          <meshStandardMaterial color="#96979b" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[room.wallThickness / 2, halfHeight, halfDepth]}
          position={[-halfWidth, halfHeight, 0]}
        />

        <mesh receiveShadow position={[halfWidth, halfHeight, 0]}>
          <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
          <meshStandardMaterial color="#939498" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[room.wallThickness / 2, halfHeight, halfDepth]}
          position={[halfWidth, halfHeight, 0]}
        />

        {/* Invisible safety boundary keeps first-person props away from the walls. */}
        <CuboidCollider
          args={[halfWidth, halfHeight, room.playerBoundaryThickness / 2]}
          position={[
            0,
            halfHeight,
            interiorBackZ + room.playerWallInset - room.playerBoundaryThickness / 2,
          ]}
        />
        <CuboidCollider
          args={[halfWidth, halfHeight, room.playerBoundaryThickness / 2]}
          position={[
            0,
            halfHeight,
            interiorFrontZ - room.playerWallInset + room.playerBoundaryThickness / 2,
          ]}
        />
        <CuboidCollider
          args={[room.playerBoundaryThickness / 2, halfHeight, halfDepth]}
          position={[
            interiorLeftX + room.playerWallInset - room.playerBoundaryThickness / 2,
            halfHeight,
            0,
          ]}
        />
        <CuboidCollider
          args={[room.playerBoundaryThickness / 2, halfHeight, halfDepth]}
          position={[
            interiorRightX - room.playerWallInset + room.playerBoundaryThickness / 2,
            halfHeight,
            0,
          ]}
        />

        <mesh position={[0, room.height + 0.03, 0]}>
          <boxGeometry args={[room.width, 0.08, room.depth]} />
          <meshStandardMaterial color="#b8b8b8" roughness={0.9} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 1.7, backWallDisplayZ]}>
        <boxGeometry args={[2.4, 1.25, 0.08]} />
        <meshStandardMaterial color="#6f737b" roughness={0.7} />
      </mesh>
      <mesh position={[leftWallDisplayX, 1.55, -2.8]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.8, 1.05, 0.08]} />
        <meshStandardMaterial color="#747881" roughness={0.7} />
      </mesh>
      <mesh position={[rightWallDisplayX, 1.55, 2.4]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.8, 1.05, 0.08]} />
        <meshStandardMaterial color="#6d717a" roughness={0.7} />
      </mesh>
    </group>
  )
}
