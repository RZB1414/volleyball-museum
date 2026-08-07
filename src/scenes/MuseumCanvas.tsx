/**
 * The R3F canvas, isolated behind a lazy boundary.
 *
 * Everything three.js touches is reachable only from here, so the title screen
 * ships without it. This file exists purely to be the split point — the scene
 * itself lives in MuseumScene.
 */

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

import { MuseumScene } from './MuseumScene'

export function MuseumCanvas() {
  return (
    <Canvas
      id="museum-canvas"
      // Uncapped devicePixelRatio on a 3x phone screen is a 9x fill-rate bill,
      // and it is the single most common reason an R3F scene dies on mid-range
      // Android.
      dpr={[1, 1.75]}
      shadows
      performance={{ min: 0.5, debounce: 200 }}
      camera={{ fov: 68, near: 0.08, far: 120, position: [0, 1.62, 5] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <MuseumScene />
      </Suspense>
    </Canvas>
  )
}
