/**
 * How much room a framed photograph takes, with its mount and its credit.
 *
 * The baked frame is only part of what hangs: the runtime adds a mount board
 * six centimetres wider than the print all round, and under it a credit line
 * that wraps to as many lines as the language needs. The Morgan portrait's
 * credit takes four, and it was hung in a wall case where the fourth ran into
 * a shelf: the frame fitted, the caption did not, and only the frame was ever
 * measured.
 *
 * These are the numbers `FramedMedia` draws with, in one place so that the
 * placement proof (`scripts/test-case-run.ts`) measures the same block the
 * player sees. Pure: no three, no React.
 */

/** The mount board shows this much round the print. */
export const MOUNT_BORDER = 0.06
/** Cap height of the credit line, metres. */
export const CREDIT_SIZE = 0.032
/** Clear space between the mount board and the first credit line. */
export const CREDIT_GAP = 0.055
/** Line pitch of the credit, as a multiple of its size. */
export const CREDIT_LINE_HEIGHT = 1.35
/** The print stands this far in front of the frame's origin, along its normal. */
export const PRINT_NUDGE = 0.032

/** Above this aspect a photograph is a panorama and takes the wide frame. */
const PANORAMA_ASPECT = 1.6

/** The width of the print, which follows the frame recipe the bake made for it. */
export function framedPrintWidth(aspect: number) {
  return aspect >= PANORAMA_ASPECT ? 1.4 : 0.34
}

export type FramedMediaBlock = {
  /** Half the width of the mount board, which the credit never exceeds. */
  readonly halfWidth: number
  /** Top of the mount board, above the frame's centre. */
  readonly top: number
  /** Bottom of the last credit line, below the frame's centre (negative). */
  readonly bottom: number
}

/** The box of everything `FramedMedia` draws, about the frame's centre. */
export function framedMediaBlock(aspect: number, captionLines: number): FramedMediaBlock {
  const width = framedPrintWidth(aspect)
  const halfHeight = width / aspect / 2
  return {
    halfWidth: width / 2 + MOUNT_BORDER,
    top: halfHeight + MOUNT_BORDER,
    bottom: -(
      halfHeight +
      MOUNT_BORDER +
      CREDIT_GAP +
      Math.max(0, captionLines) * CREDIT_SIZE * CREDIT_LINE_HEIGHT
    ),
  }
}
