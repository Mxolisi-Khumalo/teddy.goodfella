/**
 * The public surface of the motion layer.
 *
 * Consumers import from here. `./register` is internal: importing gsap directly from
 * a component risks using it before the plugins are registered.
 */

export { CursorLayer } from './CursorLayer'
export { LenisProvider } from './LenisProvider'
export { MotionProvider } from './MotionProvider'
export { ReducedMotionProvider, useReducedMotion } from './ReducedMotionProvider'
export { ScrollRefresh } from './ScrollRefresh'
export { ScrollScene } from './ScrollScene'
export type { ScrollSceneProps } from './ScrollScene'
export { useInputParallax } from './useInputParallax'
export type { InputParallax, InputParallaxOptions } from './useInputParallax'
export { useMagnetic } from './useMagnetic'
export type { MagneticOptions } from './useMagnetic'
export { useOrientationVector } from './useOrientationVector'
export type { OrientationStatus, OrientationVector } from './useOrientationVector'
export {
  useCoarsePointerCapability,
  usePointerCapability,
} from './usePointerCapability'
export { usePointerVector } from './usePointerVector'
export type {
  PointerVector,
  PointerVectorOptions,
  Vector2,
  VectorSource,
} from './usePointerVector'
export { useScrollProgress } from './useScrollProgress'
export type { ScrollProgressOptions } from './useScrollProgress'
export { useScrollVelocitySkew } from './useScrollVelocitySkew'
export type { ScrollVelocitySkewOptions } from './useScrollVelocitySkew'
export { useVectorParallax } from './useVectorParallax'
export type { VectorParallaxOptions } from './useVectorParallax'
