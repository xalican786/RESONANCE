// src/cycles.js — Cycle manager
// Tracks 10M daily cycles — recursive seeding
// Midnight reset — cycle counter and seed reset

import { H, MAX_CYCLES_DAY } from './config.js'
import { updateSeed }        from './beyond.js'

let cyclesDay    = 0
let cyclesAll    = 0
let peakDayCount = 0
let dayResetTs   = Date.now() + 86_400_000

export function recordCycle(output, HOT) {
  // Midnight reset
  if (Date.now() > dayResetTs) {
    if (cyclesDay > peakDayCount) peakDayCount = cyclesDay
    cyclesDay = 0
    dayResetTs = Date.now() + 86_400_000
  }

  cyclesDay++
  cyclesAll++

  HOT[H.CYCLES_TODAY] = cyclesDay
  HOT[H.CYCLES_TOTAL] = cyclesAll

  // Recursive seeding — each cycle's output feeds next
  const newBase = updateSeed(output)
  HOT[H.SEED_VALUE] = newBase

  return cyclesDay <= MAX_CYCLES_DAY
}

export function cyclesRemaining(HOT) {
  return Math.max(0, MAX_CYCLES_DAY - (HOT[H.CYCLES_TODAY] || 0))
}

export function getCycleStats() {
  return {
    today:    cyclesDay,
    total:    cyclesAll,
    peakDay:  peakDayCount,
    maxPerDay: MAX_CYCLES_DAY,
    pctToMax: Math.min(100, cyclesDay / MAX_CYCLES_DAY * 100).toFixed(2),
  }
}

export function startCycles(HOT) {
  HOT[H.CYCLES_TODAY] = 0
  HOT[H.CYCLES_TOTAL] = 0
  console.log(`[CYCLES] Cycle manager active | Max: ${MAX_CYCLES_DAY.toLocaleString()}/day | Recursive seeding enabled`)
}
