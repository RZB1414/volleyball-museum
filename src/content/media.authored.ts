/**
 * Project-authored imagery that does not come from the Commons fetcher.
 *
 * These assets still use the media contract so rooms consume one attributed,
 * typed catalogue. `procedural` means the image was created for this project
 * rather than copied from an external archive.
 */

import type { MediaAsset } from './schema'

export const AUTHORED_MEDIA = [
  {
    id: 'graphic-holyoke-entry-hands',
    kind: 'diagram',
    src: '/textures/media/holyoke-entry-hands.fdad446b.webp',
    aspect: 0.8,
    credit: {
      license: 'procedural',
      generator: 'imagegen/holyoke-entry-hands-v2',
    },
  },
  {
    id: 'graphic-holyoke-volleyball-demonstration',
    kind: 'diagram',
    src: '/textures/media/holyoke-volleyball-demonstration.9af4a609.webp',
    aspect: 2.5,
    credit: {
      license: 'procedural',
      generator: 'imagegen/holyoke-volleyball-demonstration-v1',
    },
  },
  {
    id: 'graphic-atrium-mural-attack',
    kind: 'diagram',
    src: '/textures/media/atrium-mural-attack.cfe8e9d4.webp',
    aspect: 0.666667,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-mural-attack-v1',
    },
  },
  {
    id: 'graphic-atrium-mural-dive',
    kind: 'diagram',
    src: '/textures/media/atrium-mural-dive.11cdb5f8.webp',
    aspect: 0.666667,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-mural-dive-v1',
    },
  },
  {
    id: 'graphic-atrium-orientation-wall',
    kind: 'diagram',
    src: '/textures/media/atrium-orientation-wall.svg',
    aspect: 5,
    credit: {
      license: 'procedural',
      generator: 'svg/atrium-orientation-wall-v1',
    },
  },
  {
    id: 'graphic-atrium-banner-navy-flight',
    kind: 'diagram',
    src: '/textures/media/atrium-banner-navy.bd4bc748.webp',
    aspect: 0.377303,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-banner-navy-flight-v1',
    },
  },
  {
    id: 'graphic-atrium-banner-burgundy-ribbon',
    kind: 'diagram',
    src: '/textures/media/atrium-banner-burgundy.e804b944.webp',
    aspect: 0.44329,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-banner-burgundy-ribbon-v1',
    },
  },
  {
    id: 'graphic-atrium-banner-navy-serve',
    kind: 'diagram',
    src: '/textures/media/atrium-banner-navy-serve.a6cf08a1.webp',
    aspect: 0.424896,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-banner-navy-serve-v1',
    },
  },
  {
    id: 'graphic-atrium-banner-burgundy-block',
    kind: 'diagram',
    src: '/textures/media/atrium-banner-burgundy-block.dbbf81e3.webp',
    aspect: 0.428811,
    credit: {
      license: 'procedural',
      generator: 'imagegen/atrium-banner-burgundy-block-v1',
    },
  },
  {
    id: 'graphic-office-blueprint',
    kind: 'diagram',
    src: '/textures/media/office-blueprint.svg',
    aspect: 1.5,
    credit: {
      license: 'procedural',
      generator: 'svg/office-blueprint-v1',
    },
  },
] as const satisfies readonly MediaAsset[]
