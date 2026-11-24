// A new URL prevents browsers from reusing the previous film after an R2 replacement.
const SEQUENCE_VERSION = "planet-191-v2"

export function heroFrameUrl(base: string, frame: number) {
  return `${base.replace(/\/?$/, "/")}${frame}.webp?v=${SEQUENCE_VERSION}`
}
