/**
 * The public surface of the motion layer.
 *
 * Consumers import from here. `./register` is internal: importing gsap directly from
 * a component risks using it before the plugins are registered.
 */

export { MotionProvider } from './MotionProvider'
export { ReducedMotionProvider, useReducedMotion } from './ReducedMotionProvider'
export { LenisProvider } from './LenisProvider'
export { ScrollRefresh } from './ScrollRefresh'
export { ScrollScene } from './ScrollScene'
export type { ScrollSceneProps } from './ScrollScene'
export { useScrollProgress } from './useScrollProgress'
export type { ScrollProgressOptions } from './useScrollProgress'
