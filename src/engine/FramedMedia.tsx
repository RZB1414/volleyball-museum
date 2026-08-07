/**
 * A framed photograph or document scan, with its credit printed beneath it.
 *
 * The credit is not optional decoration. Almost every image a volleyball museum
 * would want is someone else's copyright; the ones used here are public domain
 * by age or Creative Commons, and every CC licence requires attribution at the
 * point of use. So the line under the frame is part of the exhibit, exactly as
 * a real museum credits a lender on the label.
 *
 * The text is rendered at runtime rather than baked into the texture because
 * the museum ships in pt-BR and en, and a baked caption can only be one of them.
 */

import { Text } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { DoubleSide, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { useLoader } from '@react-three/fiber'

import { formatCreditLine } from '../content/credit'
import type { MediaAsset } from '../content/schema'
import { useMuseum } from '../state/store'

export type FramedMediaProps = {
  asset: MediaAsset
  /** Width of the image itself, in metres. Height follows from the aspect. */
  width: number
  position: [number, number, number]
  rotationY?: number
}

const MOUNT_BORDER = 0.06
const CREDIT_SIZE = 0.032
const CREDIT_GAP = 0.055

export function FramedMedia({ asset, width, position, rotationY = 0 }: FramedMediaProps) {
  const locale = useMuseum((state) => state.settings.locale)
  const texture = useLoader(TextureLoader, asset.src) as Texture

  useEffect(() => {
    // Photographs are colour, so they decode as sRGB. Getting this wrong washes
    // a sepia print out to grey.
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  const height = width / asset.aspect
  const credit = useMemo(() => formatCreditLine(asset.credit, locale), [asset.credit, locale])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Mount board behind the print. */}
      <mesh position={[0, 0, -0.004]} receiveShadow>
        <planeGeometry args={[width + MOUNT_BORDER * 2, height + MOUNT_BORDER * 2]} />
        <meshStandardMaterial color="#e8e0cf" roughness={0.94} />
      </mesh>

      <mesh castShadow receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.82} />
      </mesh>

      {/*
        The credit line. Museum caption type: small, quiet, and never competing
        with the artwork. troika renders it as an SDF so it stays crisp when the
        player walks right up to read it.
      */}
      <Text
        position={[
          -(width / 2 + MOUNT_BORDER),
          -(height / 2 + MOUNT_BORDER + CREDIT_GAP),
          0.002,
        ]}
        anchorX="left"
        anchorY="top"
        fontSize={CREDIT_SIZE}
        maxWidth={width + MOUNT_BORDER * 2}
        lineHeight={1.35}
        color="#6d6455"
        outlineWidth={0}
        // Labels are read head-on but glimpsed from the side; double-sided
        // costs nothing on a quad and avoids a caption vanishing at an angle.
        material-side={DoubleSide}
        material-toneMapped={false}
      >
        {credit}
      </Text>
    </group>
  )
}
