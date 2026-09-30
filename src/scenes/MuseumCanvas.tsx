/**
 * The R3F canvas, isolated behind a lazy boundary.
 *
 * Everything three.js touches is reachable only from here, so the title screen
 * ships without it. This file exists purely to be the split point — the scene
 * itself lives in MuseumScene.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'

import { CAMERA_BASE_VERTICAL_FOV_DEGREES } from '../engine/cameraProjection'
import {
  advanceAdaptiveScale,
  isSlowFrame,
  renderDprFor,
  type AdaptiveScaleState,
  type RenderSurface,
} from '../engine/renderQuality'
import { useMuseum, type QualityTier } from '../state/store'
import { MuseumScene } from './MuseumScene'

function AdaptiveRenderQuality({
  quality,
  deviceDpr,
  surface,
}: {
  quality: QualityTier
  deviceDpr: number
  surface: RenderSurface
}) {
  const setDpr = useThree((state) => state.setDpr)
  const canvas = useThree((state) => state.gl.domElement)
  const adaptiveRef = useRef<AdaptiveScaleState>({
    scale: 1,
    goodSeconds: 0,
    slowSeconds: 0,
    adjustmentCooldown: 0,
  })
  const appliedDprRef = useRef(renderDprFor(quality, deviceDpr, 1, surface))
  const appliedScaleRef = useRef(1)
  const skipVisibilityResumeRef = useRef(false)

  useEffect(() => {
    adaptiveRef.current = {
      scale: 1,
      goodSeconds: 0,
      slowSeconds: 0,
      adjustmentCooldown: 0,
    }
    const target = renderDprFor(quality, deviceDpr, 1, surface)
    appliedDprRef.current = target
    appliedScaleRef.current = 1
    canvas.dataset.adaptiveScale = '1'
    setDpr(target)
  }, [canvas, deviceDpr, quality, setDpr, surface])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') skipVisibilityResumeRef.current = true
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useFrame((state, delta) => {
    if (document.visibilityState !== 'visible') return
    // The first rAF after a hidden tab resumes contains paused wall-clock time,
    // not renderer pressure. Every later long foreground frame is real and must
    // lower the quality ceiling.
    if (skipVisibilityResumeRef.current) {
      skipVisibilityResumeRef.current = false
      return
    }

    const slowFrame = isSlowFrame(delta)
    advanceAdaptiveScale(adaptiveRef.current, delta, slowFrame)

    // One adaptive authority avoids the old sawtooth: R3F's binary regression
    // jumped to 0.65 after one long frame and resized the backbuffer again 1.2
    // seconds later, fighting this component's gradual hysteresis.
    const scale = adaptiveRef.current.scale
    if (scale !== appliedScaleRef.current) {
      appliedScaleRef.current = scale
      canvas.dataset.adaptiveScale = scale.toFixed(2)
    }
    const target = renderDprFor(quality, deviceDpr, scale, {
      width: state.size.width,
      height: state.size.height,
      mobile: surface.mobile,
    })
    if (Math.abs(target - appliedDprRef.current) < 0.01) return
    appliedDprRef.current = target
    canvas.dataset.adaptiveScale = scale.toFixed(2)
    setDpr(target)
  })

  return null
}

type RenderEnvironment = RenderSurface & { readonly deviceDpr: number }

function readRenderEnvironment(): RenderEnvironment {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720, mobile: false, deviceDpr: 1 }
  }
  // Match the same narrow-landscape fallback that exposes the touch controls.
  // Some embedded Android WebViews and the visual-QA browser do not advertise
  // a coarse pointer even though their viewport is unmistakably phone-sized.
  const mobileViewport = window.matchMedia(
    '(any-pointer: coarse), (max-width: 900px) and (orientation: landscape)',
  ).matches
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    mobile: mobileViewport || navigator.maxTouchPoints > 0,
    deviceDpr: window.devicePixelRatio || 1,
  }
}

function useRenderEnvironment() {
  const [environment, setEnvironment] = useState(readRenderEnvironment)

  useEffect(() => {
    const coarseQuery = window.matchMedia(
      '(any-pointer: coarse), (max-width: 900px) and (orientation: landscape)',
    )
    let updateFrame = 0
    const update = () => {
      window.cancelAnimationFrame(updateFrame)
      updateFrame = window.requestAnimationFrame(() => {
        const next = readRenderEnvironment()
        setEnvironment((current) =>
          current.width === next.width &&
          current.height === next.height &&
          current.mobile === next.mobile &&
          current.deviceDpr === next.deviceDpr
            ? current
            : next,
        )
      })
    }

    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    coarseQuery.addEventListener('change', update)
    return () => {
      window.cancelAnimationFrame(updateFrame)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      coarseQuery.removeEventListener('change', update)
    }
  }, [])

  return environment
}

export function MuseumCanvas() {
  const quality = useMuseum((state) => state.settings.quality)
  const environment = useRenderEnvironment()
  const surface: RenderSurface = environment
  const restingDpr = renderDprFor(quality, environment.deviceDpr, 1, surface)

  return (
    <Canvas
      id="museum-canvas"
      // Uncapped devicePixelRatio on a 3x phone screen is a 9x fill-rate bill,
      // and it is the single most common reason an R3F scene dies on mid-range
      // Android.
      dpr={restingDpr}
      shadows={false}
      performance={{ min: 1, max: 1 }}
      camera={{
        fov: CAMERA_BASE_VERTICAL_FOV_DEGREES,
        near: 0.08,
        far: 120,
        position: [0, 1.62, 5],
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <AdaptiveRenderQuality
        quality={quality}
        deviceDpr={environment.deviceDpr}
        surface={surface}
      />
      <Suspense fallback={null}>
        <MuseumScene />
      </Suspense>
    </Canvas>
  )
}
