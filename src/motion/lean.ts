/**
 * The maths behind device-orientation parallax, with no React and no DOM.
 *
 * Extracted deliberately. Everything else in the mobile motion path can be checked in
 * a browser, but this cannot: it needs a gyroscope, and a desktop does not have one.
 * Synthetic `DeviceOrientationEvent`s get as far as this function and no further,
 * because applying the result runs on GSAP's ticker and therefore on rAF, which a
 * background tab suspends outright.
 *
 * So the one part of the feature with real logic in it — baseline capture, angle
 * wrapping, screen rotation, clamping, recentring — lives here where it can be driven
 * with known inputs and asserted against. See `scripts/verify-lean.mjs`.
 */

/** Degrees of lean that map to the full -1..1 range. */
export const RANGE_DEGREES = 16

/**
 * How fast the neutral point follows the visitor, per sample.
 *
 * This is the important constant and it is not a smoothing filter — it is what makes
 * the effect respond to *change* in how the phone is held rather than to absolute
 * attitude. Two things break without it:
 *
 *  1. Nobody holds a phone flat. Reading posture is 45-70 degrees of beta, so
 *     normalising against zero would pin the hero to its extreme offset on load and
 *     leave it there. The neutral point has to be wherever the visitor already is.
 *  2. Device orientation drifts, and so does a human arm over the course of a scroll.
 *     A baseline captured once at mount is wrong within seconds.
 *
 * At roughly 60Hz this is a ~4s time constant: a flick of the wrist registers in
 * full, a sustained tilt decays back to centre rather than parking the image at the
 * edge. NEEDS A PASS ON REAL HARDWARE — like the cursor's spring lag, this is a feel
 * judgement that cannot be made from a desktop with no sensor.
 */
export const RECENTRE_RATE = 0.004

/** Light low-pass, per sample. Kills single-sample sensor spikes. ~0.09s constant. */
export const SMOOTHING = 0.18

/**
 * Mutable integrator state. Mutated in place rather than returned, because this runs
 * per sensor sample and the handler's contract is that it allocates nothing.
 *
 * Null baselines mean "no sample seen yet". They are not zero: zero is a real,
 * wrong answer (a phone lying face up), and treating the first reading as zero is
 * exactly the bug that pins the hero to one edge.
 */
export interface LeanState {
  baseBeta: number | null
  baseGamma: number | null
  x: number
  y: number
}

export function createLeanState(): LeanState {
  return { baseBeta: null, baseGamma: null, x: 0, y: 0 }
}

/** Shortest signed distance between two angles, so 179 -> -179 is 2 and not -358. */
export function wrapDegrees(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180
}

export function clampUnit(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value
}

/**
 * Fold one sensor reading into the state.
 *
 * `angle` is `screen.orientation.angle`. beta and gamma are expressed in the device's
 * natural frame, so they swap and change sign as the screen rotates; without this a
 * phone held in landscape gets its parallax axes transposed.
 *
 * Portrait is the verified case. The landscape mappings are the conventional ones and
 * are NOT verified on hardware — a sign error there inverts the direction of an 8px
 * offset, which is the reason it is worth shipping unverified rather than cutting.
 */
export function integrateLean(
  state: LeanState,
  beta: number,
  gamma: number,
  angle: number,
): void {
  if (state.baseBeta === null || state.baseGamma === null) {
    state.baseBeta = beta
    state.baseGamma = gamma
    return
  }

  const dBeta = wrapDegrees(beta - state.baseBeta)
  const dGamma = wrapDegrees(gamma - state.baseGamma)

  // Follow the visitor's neutral point slowly. See RECENTRE_RATE.
  state.baseBeta += dBeta * RECENTRE_RATE
  state.baseGamma += dGamma * RECENTRE_RATE

  let x: number
  let y: number

  if (angle === 90) {
    x = -dBeta
    y = dGamma
  } else if (angle === 180) {
    x = -dGamma
    y = -dBeta
  } else if (angle === 270 || angle === -90) {
    x = dBeta
    y = -dGamma
  } else {
    x = dGamma
    y = dBeta
  }

  state.x += (clampUnit(x / RANGE_DEGREES) - state.x) * SMOOTHING
  state.y += (clampUnit(y / RANGE_DEGREES) - state.y) * SMOOTHING
}
