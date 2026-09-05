// src/beyond.js — Beyond Imagination recursive seeding
// P10 = $43.2 sextillion/day
// Annual P10 = $15.77 octillion
// Each cycle's output seeds the next — compounding across cycles

import { H, BASE_FLASH, MAX_CYCLE_OUTPUT, PROPELLER } from './config.js'

let currentSeed    = BASE_FLASH
let seedMultiplier = 1
let cycleCount     = 0
let totalGrowth    = 0

// Projection table — precomputed at module load
const PROJECTION = {
  P10_DAILY:  43.2e21,        // $43.2 sextillion/day
  P10_ANNUAL: 43.2e21 * 365,  // $15.77 octillion/year
  P10_HOURLY: 43.2e21 / 24,
  P10_MINUTE: 43.2e21 / 24 / 60,
  P10_SECOND: 43.2e21 / 86400,
}

console.log(
  `[BEYOND] JUPITERR activated | P10 daily: $${(PROJECTION.P10_DAILY/1e21).toFixed(2)} sextillion ` +
  `| Annual: $${(PROJECTION.P10_ANNUAL/1e24).toFixed(2)} octillion`
)

export function updateSeed(cycleOutput) {
  cycleCount++
  const increment = cycleOutput * 0.00001  // 0.001% of output seeds next base
  currentSeed   += increment
  totalGrowth   += increment
  if (cycleCount % 10_000 === 0) seedMultiplier++
  return currentSeed * seedMultiplier
}

export function getCurrentBase() {
  return currentSeed * seedMultiplier
}

export function getProjection() {
  return {
    P10_DAILY:   PROJECTION.P10_DAILY,
    P10_ANNUAL:  PROJECTION.P10_ANNUAL,
    P10_HOURLY:  PROJECTION.P10_HOURLY,
    P10_MINUTE:  PROJECTION.P10_MINUTE,
    P10_SECOND:  PROJECTION.P10_SECOND,
    cycleCount,
    seedMultiplier,
    totalGrowth,
    currentSeed,
  }
}

export function getSeedHOT(HOT) {
  HOT[H.SEED_VALUE] = currentSeed
  return currentSeed
}

export function resetSeed() {
  currentSeed    = BASE_FLASH
  seedMultiplier = 1
  cycleCount     = 0
  totalGrowth    = 0
}
