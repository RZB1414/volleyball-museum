/**
 * The loader for wall art and exhibit photographs: a TextureLoader that
 * cannot fail.
 *
 * `useLoader` turns a loader error into a thrown exception, and nothing in
 * the scene catches one: a single wall image answering 404 unmounted the
 * whole game and left a blank page, before the player had reached the door.
 * A photograph is not worth that. An image that cannot be loaded resolves
 * to a one-pixel card-grey texture, flagged so that a later lot can show a
 * proper "image unavailable" card, and the room goes on.
 *
 * Material textures deliberately stay on the plain TextureLoader: without
 * the floor and the plaster there is no game to go on with, and a blank
 * page is the honest result.
 *
 * One class for every caller (`RoomWallArt`, `FramedMedia`, the preloader):
 * `useLoader` caches by loader class and URL, so two classes would fetch and
 * decode a shared photograph twice.
 */

import { DataTexture, SRGBColorSpace, TextureLoader, type Texture } from 'three'

/** The grey of unprinted museum board, sRGB. */
const MISSING_MEDIA_RGBA = [143, 138, 128, 255] as const

const warned = new Set<string>()

/** What a TextureLoader hands back: a texture whose source is an image element. */
type ImageTexture = Texture<HTMLImageElement>

function missingMediaTexture(url: string): ImageTexture {
  const texture = new DataTexture(new Uint8Array(MISSING_MEDIA_RGBA), 1, 1)
  texture.name = `media-missing:${url}`
  texture.colorSpace = SRGBColorSpace
  texture.userData.mediaMissing = true
  texture.needsUpdate = true
  // A data texture where the type promises an image element. Every consumer
  // treats the result as an opaque map (colour space, anisotropy, a material
  // slot); none reads the image, and `userData.mediaMissing` says which it is.
  return texture as unknown as ImageTexture
}

export class MediaTextureLoader extends TextureLoader {
  /**
   * As `TextureLoader.load`, except that a failure calls `onLoad` with the
   * stand-in instead of `onError`, which is never called.
   */
  load(
    url: string,
    onLoad?: (texture: ImageTexture) => void,
    onProgress?: (event: ProgressEvent) => void,
    _onError?: (error: unknown) => void,
  ): ImageTexture {
    return super.load(url, onLoad, onProgress, (error) => {
      // Once per image, not once per frame it is drawn in, and loud enough to
      // be seen: the stand-in is a decision to keep playing, not to hide it.
      if (!warned.has(url)) {
        warned.add(url)
        console.warn(`[museum] Could not load image ${url}; showing a blank card in its place.`, error)
      }
      onLoad?.(missingMediaTexture(url))
    })
  }
}
