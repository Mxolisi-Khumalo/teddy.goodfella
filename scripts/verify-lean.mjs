/**
 * Drives the device-orientation lean maths with known readings and asserts the
 * results. Run: `node scripts/verify-lean.mjs`
 *
 * WHY THIS EXISTS RATHER THAN A BROWSER CHECK
 * The effect needs a gyroscope. Synthetic `DeviceOrientationEvent`s reach the
 * handler, but applying the result runs on GSAP's ticker and therefore on rAF, which
 * a background tab suspends — so a hidden browser pane reports no movement whether
 * the maths is right or wrong. This drives the shipped function directly instead.
 *
 * Imports the .ts source, relying on Node's native type stripping, so what is
 * asserted here is the code that ships rather than a copy of it.
 */

import assert from 'node:assert/strict'

import {
  createLeanState,
  integrateLean,
  RANGE_DEGREES,
  SMOOTHING,
  wrapDegrees,
} from '../src/motion/lean.ts'

/** Feed a held attitude for n samples, as the sensor would at ~60Hz. */
function hold(state, beta, gamma, samples, angle = 0) {
  for (let i = 0; i < samples; i += 1) {
    integrateLean(state, beta, gamma, angle)
  }
  return state
}

const round = (n) => Math.round(n * 1000) / 1000
const results = []

function check(label, actual, predicate, expectation) {
  const pass = predicate(actual)
  results.push({ label, value: round(actual), expectation, pass })
  return pass
}

// --- wrapDegrees ------------------------------------------------------------
assert.equal(wrapDegrees(2), 2)
assert.equal(wrapDegrees(-2), -2)
// The case that matters: beta crossing the +-180 discontinuity must read as a small
// step, not a 358-degree lurch. Note the SIGN — moving from -179 to +179 means the
// device rotated 2 degrees NEGATIVE, down through the seam, so -2 is correct and a
// naive subtraction's +358 is not.
assert.equal(wrapDegrees(179 - -179), -2)
assert.equal(wrapDegrees(-179 - 179), 2)
assert.equal(wrapDegrees(360), 0)
assert.equal(wrapDegrees(-360), 0)
results.push({
  label: 'wrapDegrees across +-180',
  value: wrapDegrees(179 - -179),
  expectation: '-2, not +358',
  pass: wrapDegrees(179 - -179) === -2,
})

// --- 1. the first reading is a baseline, not a lean -------------------------
// This is the bug that would pin the hero to one edge on load: reading posture is
// 55 degrees of beta, and normalising that against zero is a full-range tilt.
{
  const s = createLeanState()
  integrateLean(s, 55, 0, 0)
  check('held at beta 55, one sample: x', s.x, (v) => v === 0, 'exactly 0')
  check('held at beta 55, one sample: y', s.y, (v) => v === 0, 'exactly 0')
  assert.equal(s.baseBeta, 55, 'baseline must capture the posture it was handed')
}

// --- 2. a held posture produces no offset, however long it is held ----------
{
  const s = hold(createLeanState(), 55, 0, 120)
  check('held at beta 55, 120 samples: x', s.x, (v) => Math.abs(v) < 1e-9, '~0')
  check('held at beta 55, 120 samples: y', s.y, (v) => Math.abs(v) < 1e-9, '~0')
}

// --- 3. a lean to the edge of the range approaches full deflection ----------
// Not exactly 1: RECENTRE_RATE is already pulling the neutral point toward the new
// attitude while the low-pass is still converging on it.
{
  const s = hold(createLeanState(), 55, 0, 30)
  hold(s, 55, RANGE_DEGREES, 45)
  check('lean right 16deg: x', s.x, (v) => v > 0.7 && v < 1, '0.7..1.0 (positive)')
  check('lean right 16deg: y', s.y, (v) => Math.abs(v) < 0.02, '~0 (no vertical)')
}

// --- 4. past the range it clamps, rather than continuing ---------------------
// A phone can report 90 degrees of gamma. Without the clamp that is 5.6x full
// deflection, and the plane slides several hundred px off frame.
{
  const s = hold(createLeanState(), 55, 0, 30)
  hold(s, 55, 90, 90)
  check('lean right 90deg: x', s.x, (v) => v <= 1 + 1e-9, 'never exceeds 1')
  const far = hold(createLeanState(), 55, 0, 30)
  hold(far, 55, -90, 90)
  check('lean left 90deg: x', far.x, (v) => v >= -1 - 1e-9, 'never below -1')
}

// --- 5. the two axes are independent ----------------------------------------
{
  const s = hold(createLeanState(), 55, 0, 30)
  hold(s, 55 - RANGE_DEGREES, 0, 45)
  check('tilt forward 16deg: y', s.y, (v) => v < -0.7 && v >= -1, '-1.0..-0.7')
  check('tilt forward 16deg: x', s.x, (v) => Math.abs(v) < 0.02, '~0 (no lateral)')
}

// --- 6. a sustained lean decays back to centre ------------------------------
// The effect responds to CHANGE in attitude. Holding a tilt is not a joystick: the
// neutral point catches up, so the image returns rather than parking at the edge.
{
  const s = hold(createLeanState(), 55, 0, 30)
  hold(s, 55, RANGE_DEGREES, 45)
  const peak = s.x
  hold(s, 55, RANGE_DEGREES, 60 * 12) // ~12 seconds of holding it there
  check('held lean, peak', peak, (v) => v > 0.7, '> 0.7')
  check('held lean after ~12s: x', s.x, (v) => v < peak * 0.25, '< 25% of peak')
}

// --- 7. screen rotation transposes the axes ---------------------------------
// Same physical movement, four screen angles. A lean the visitor perceives as
// lateral must stay lateral after they rotate the phone.
{
  const angles = [0, 90, 180, 270]
  const table = angles.map((angle) => {
    const s = hold(createLeanState(), 55, 0, 30, angle)
    hold(s, 55, RANGE_DEGREES, 45, angle)
    return { angle, x: round(s.x), y: round(s.y) }
  })

  // gamma is lateral in portrait and vertical in landscape. The magnitude must be
  // preserved across all four; only which axis it lands on changes.
  for (const row of table) {
    const magnitude = Math.hypot(row.x, row.y)
    check(
      `screen angle ${row.angle}: |lean| for +16 gamma`,
      magnitude,
      (v) => v > 0.7 && v <= 1.0001,
      '0.7..1.0 on exactly one axis',
    )
  }

  assert.ok(
    Math.abs(table[0].x) > 0.7 && Math.abs(table[0].y) < 0.02,
    'portrait: lateral',
  )
  assert.ok(Math.abs(table[1].y) > 0.7 && Math.abs(table[1].x) < 0.02, '90: vertical')
  assert.ok(Math.abs(table[2].x) > 0.7 && Math.abs(table[2].y) < 0.02, '180: lateral')
  assert.ok(Math.abs(table[3].y) > 0.7 && Math.abs(table[3].x) < 0.02, '270: vertical')
  assert.equal(Math.sign(table[0].x), -Math.sign(table[2].x), '180 inverts portrait')
  assert.equal(Math.sign(table[1].y), -Math.sign(table[3].y), '270 inverts 90')
}

// --- 8. settling time, in frames --------------------------------------------
// The low-pass must not be so slow that the effect lags the hand noticeably. This
// reports rather than asserts: it is the number to look at when the feel pass on real
// hardware says it is too sluggish or too twitchy.
{
  const s = hold(createLeanState(), 55, 0, 30)
  let frames = 0
  while (s.x < 0.632 && frames < 600) {
    integrateLean(s, 55, RANGE_DEGREES, 0)
    frames += 1
  }
  results.push({
    label: 'frames to reach 63% of a full lean',
    value: frames,
    expectation: `~${Math.ceil(1 / SMOOTHING)} at SMOOTHING ${SMOOTHING}`,
    pass: frames <= 12,
  })
}

// --- report -----------------------------------------------------------------
const width = Math.max(...results.map((r) => r.label.length))
for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL'
  console.log(
    `${mark}  ${r.label.padEnd(width)}  ${String(r.value).padStart(8)}   expected ${r.expectation}`,
  )
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)

if (failed.length > 0) {
  process.exitCode = 1
}
