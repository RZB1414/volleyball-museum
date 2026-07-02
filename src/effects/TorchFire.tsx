import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  MathUtils,
  ShaderMaterial,
} from 'three'

type Ember = {
  age: number
  driftX: number
  driftZ: number
  life: number
  originX: number
  originZ: number
  phase: number
  riseHeight: number
  swirlRadius: number
  swirlSpeed: number
}

const EMBER_COUNT = 48
const FLAME_WIDTH = 0.42
const FLAME_HEIGHT = 0.64
const GLOW_SIZE = 0.85

// Screen-aligned billboard that keeps the scale animated on the parent group.
const billboardVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec2 scale = vec2(length(modelViewMatrix[0].xyz), length(modelViewMatrix[1].xyz));
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy * scale;

    gl_Position = projectionMatrix * mvPosition;
  }
`

const flameFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);

    // Turbulence scrolls downward so the flame reads as rising.
    float turbulence = fbm(vec2(p.x * 2.2, p.y * 3.2 - uTime * 2.4));
    float detail = fbm(vec2(p.x * 5.0 + 4.7, p.y * 7.0 - uTime * 3.4));

    // Horizontal wobble that grows with height.
    float bend = (fbm(vec2(uTime * 1.1, p.y * 1.6 - uTime * 1.9)) - 0.5) * 1.2;
    float x = p.x + bend * p.y * p.y + (turbulence - 0.5) * 0.6 * (0.15 + p.y);

    // Teardrop silhouette: wide base, pinched tip.
    float width = mix(0.52, 0.03, pow(p.y, 1.35));
    float body = 1.0 - smoothstep(width * 0.2, width, abs(x));

    // Vertical envelope with noisy erosion so the tip breaks into tongues.
    float envelope = smoothstep(0.0, 0.12, p.y)
      * (1.0 - smoothstep(0.62, 1.0, p.y + (0.5 - turbulence) * 0.35));

    float intensity = body * envelope;
    intensity *= 0.72 + turbulence * 0.6;
    intensity -= detail * 0.22 * p.y;
    intensity = clamp(intensity, 0.0, 1.0);

    // Hot core hugging the wick.
    float core = 1.0 - smoothstep(0.0, 0.5, length(vec2(x * 1.7, (p.y - 0.18) * 1.5)));
    core = clamp(core * (0.6 + turbulence * 0.5), 0.0, 1.0);

    vec3 color = mix(vec3(0.5, 0.02, 0.0), vec3(1.0, 0.34, 0.02), smoothstep(0.04, 0.4, intensity));
    color = mix(color, vec3(1.0, 0.76, 0.28), smoothstep(0.4, 0.78, intensity));
    color = mix(color, vec3(1.0, 0.96, 0.82), core * smoothstep(0.3, 0.75, intensity));

    float alpha = smoothstep(0.05, 0.35, intensity);
    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);
  }
`

const glowFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float distanceToCenter = length(p);

    float flicker = 0.82
      + 0.12 * sin(uTime * 13.7) * sin(uTime * 7.3 + 1.7)
      + 0.06 * sin(uTime * 23.1);

    float glow = pow(clamp(1.0 - distanceToCenter, 0.0, 1.0), 3.0) * flicker;
    vec3 color = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.62, 0.18), glow);

    float alpha = glow * 0.38;
    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);
  }
`

const sparkVertexShader = /* glsl */ `
  attribute float aAge;
  attribute float aSize;
  uniform float uViewportHeight;
  varying float vAge;

  void main() {
    vAge = aAge;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float groupScale = length(modelViewMatrix[1].xyz);
    float fadeIn = smoothstep(0.0, 0.15, aAge);
    float shrink = 1.0 - aAge * 0.75;

    gl_PointSize = aSize * groupScale * fadeIn * shrink
      * projectionMatrix[1][1] * uViewportHeight * 0.5
      / max(-mvPosition.z, 0.1);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const sparkFragmentShader = /* glsl */ `
  varying float vAge;

  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float distanceToCenter = length(offset) * 2.0;

    float falloff = 1.0 - smoothstep(0.25, 1.0, distanceToCenter);
    float fade = (1.0 - smoothstep(0.55, 1.0, vAge)) * smoothstep(0.0, 0.1, vAge);
    float alpha = falloff * fade;

    vec3 color = mix(vec3(1.0, 0.88, 0.5), vec3(1.0, 0.4, 0.04), smoothstep(0.05, 0.55, vAge));
    color = mix(color, vec3(0.55, 0.06, 0.0), smoothstep(0.55, 0.95, vAge));

    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);
  }
`

function createEmber(): Ember {
  const spawnAngle = Math.random() * Math.PI * 2
  const spawnRadius = Math.random() * 0.035

  return {
    age: Math.random(),
    driftX: MathUtils.lerp(-0.05, 0.05, Math.random()),
    driftZ: MathUtils.lerp(-0.05, 0.05, Math.random()),
    life: MathUtils.lerp(0.5, 1.3, Math.random()),
    originX: Math.cos(spawnAngle) * spawnRadius,
    originZ: Math.sin(spawnAngle) * spawnRadius,
    phase: Math.random() * Math.PI * 2,
    riseHeight: MathUtils.lerp(0.3, 0.6, Math.random()),
    swirlRadius: MathUtils.lerp(0.015, 0.06, Math.random()),
    swirlSpeed: MathUtils.lerp(2, 7, Math.random()),
  }
}

export function TorchFire() {
  const timeUniform = useMemo(() => ({ value: 0 }), [])
  const viewportHeightUniform = useMemo(() => ({ value: 1 }), [])

  const flameMaterial = useMemo(
    () =>
      new ShaderMaterial({
        blending: AdditiveBlending,
        depthWrite: false,
        fragmentShader: flameFragmentShader,
        transparent: true,
        uniforms: { uTime: timeUniform },
        vertexShader: billboardVertexShader,
      }),
    [timeUniform],
  )

  const glowMaterial = useMemo(
    () =>
      new ShaderMaterial({
        blending: AdditiveBlending,
        depthWrite: false,
        fragmentShader: glowFragmentShader,
        transparent: true,
        uniforms: { uTime: timeUniform },
        vertexShader: billboardVertexShader,
      }),
    [timeUniform],
  )

  const sparkMaterial = useMemo(
    () =>
      new ShaderMaterial({
        blending: AdditiveBlending,
        depthWrite: false,
        fragmentShader: sparkFragmentShader,
        transparent: true,
        uniforms: { uViewportHeight: viewportHeightUniform },
        vertexShader: sparkVertexShader,
      }),
    [viewportHeightUniform],
  )

  const embers = useMemo(() => Array.from({ length: EMBER_COUNT }, createEmber), [])

  const sparkAttributes = useMemo(() => {
    const positions = new BufferAttribute(new Float32Array(EMBER_COUNT * 3), 3)
    positions.setUsage(DynamicDrawUsage)

    const ages = new BufferAttribute(new Float32Array(EMBER_COUNT), 1)
    ages.setUsage(DynamicDrawUsage)

    const sizes = new BufferAttribute(new Float32Array(EMBER_COUNT), 1)
    for (let index = 0; index < EMBER_COUNT; index += 1) {
      sizes.setX(index, MathUtils.lerp(0.014, 0.032, Math.random()))
    }

    return { ages, positions, sizes }
  }, [])

  const sparkGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', sparkAttributes.positions)
    geometry.setAttribute('aAge', sparkAttributes.ages)
    geometry.setAttribute('aSize', sparkAttributes.sizes)
    return geometry
  }, [sparkAttributes])

  useEffect(
    () => () => {
      flameMaterial.dispose()
      glowMaterial.dispose()
      sparkMaterial.dispose()
      sparkGeometry.dispose()
    },
    [flameMaterial, glowMaterial, sparkMaterial, sparkGeometry],
  )

  useFrame((state, delta) => {
    // Wrapped to keep the sin-based shader hash inside float32 precision on long sessions.
    timeUniform.value = state.clock.elapsedTime % 64
    viewportHeightUniform.value = state.size.height * state.viewport.dpr

    embers.forEach((ember, index) => {
      ember.age += delta / ember.life

      if (ember.age >= 1) {
        Object.assign(ember, createEmber())
        ember.age = 0
      }

      const rise = ember.age
      const swirlAngle = ember.phase + rise * ember.swirlSpeed
      const spread = ember.swirlRadius * rise

      sparkAttributes.positions.setXYZ(
        index,
        ember.originX + Math.cos(swirlAngle) * spread + ember.driftX * rise,
        -0.06 + rise * ember.riseHeight,
        ember.originZ + Math.sin(swirlAngle) * spread + ember.driftZ * rise,
      )
      sparkAttributes.ages.setX(index, ember.age)
    })

    sparkAttributes.positions.needsUpdate = true
    sparkAttributes.ages.needsUpdate = true
  })

  return (
    <group>
      <mesh frustumCulled={false} material={flameMaterial} position={[0, FLAME_HEIGHT / 2 - 0.16, 0]}>
        <planeGeometry args={[FLAME_WIDTH, FLAME_HEIGHT]} />
      </mesh>

      <mesh frustumCulled={false} material={glowMaterial} position={[0, 0.06, 0]}>
        <planeGeometry args={[GLOW_SIZE, GLOW_SIZE]} />
      </mesh>

      <points frustumCulled={false} geometry={sparkGeometry} material={sparkMaterial} />
    </group>
  )
}
