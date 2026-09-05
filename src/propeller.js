// src/propeller.js — RESONANCE P1-P10
// P10 = $43.2 sextillion/day = beyond imagination = the propeller itself

import {
  H, PROPELLER, PROPELLER_ANNUAL, DAILY_TARGET,
  setPropeller, ACTIVE_PROPELLER, MAX_CYCLE_OUTPUT,
} from './config.js'

function fB(n) {
  if (!n || isNaN(n) || n === 0) return '$0'
  const x = Number(n)
  if (x >= 1e27) return '$' + (x/1e27).toFixed(2) + ' OCT'
  if (x >= 1e24) return '$' + (x/1e24).toFixed(2) + ' SEPT'
  if (x >= 1e21) return '$' + (x/1e21).toFixed(2) + ' SEXT'
  if (x >= 1e18) return '$' + (x/1e18).toFixed(2) + ' QUINT'
  if (x >= 1e15) return '$' + (x/1e15).toFixed(2) + 'Q'
  if (x >= 1e12) return '$' + (x/1e12).toFixed(2) + 'T'
  if (x >= 1e9)  return '$' + (x/1e9).toFixed(2)  + 'B'
  return '$' + n.toFixed(2)
}

export function getVelocity(HOT) {
  const uptime = HOT[H.UPTIME] || 1
  const rev    = HOT[H.REV_TODAY] || 0
  return {
    perSecond: rev / uptime,
    perMinute: rev / uptime * 60,
    perHour:   rev / uptime * 3600,
    perDay:    rev / uptime * 86400,
  }
}

export function getProgress(HOT) {
  const target  = DAILY_TARGET
  const actual  = HOT[H.REV_TODAY] || 0
  const pct     = target > 0 ? Math.min(100, actual / target * 100) : 0
  return { target, actual, pct, remaining: Math.max(0, target - actual) }
}

export function activatePropeller(level, HOT) {
  const ok = setPropeller(level)
  if (!ok) return false
  HOT[H.PROPELLER]     = parseInt(level.replace('P',''))
  HOT[H.DAILY_TARGET]  = PROPELLER[level]
  HOT[H.CYCLES_NEEDED] = level === 'P10'
    ? 10_000_000  // max cycles at P10
    : Math.ceil(PROPELLER[level] / MAX_CYCLE_OUTPUT)
  console.log(
    `[PROPELLER] ${level} | ${fB(PROPELLER[level])}/day | ` +
    `${HOT[H.CYCLES_NEEDED].toLocaleString()} cycles needed` +
    (level === 'P10' ? ' | BEYOND IMAGINATION ACTIVE' : '')
  )
  return true
}

export function getPropellerStats() {
  return Object.entries(PROPELLER).map(([level, target]) => ({
    level,
    target,
    targetDisplay: fB(target) + '/day',
    cyclesNeeded:  level === 'P10' ? 10_000_000 : Math.ceil(target / MAX_CYCLE_OUTPUT),
    active:        level === ACTIVE_PROPELLER,
    isBeyond:      level === 'P10',
    annualProjection: level === 'P10' ? fB(PROPELLER_ANNUAL.P10) + '/year' : null,
  }))
}

export function startPropeller(HOT) {
  HOT[H.PROPELLER]    = 1
  HOT[H.DAILY_TARGET] = PROPELLER.P1
  HOT[H.CYCLES_NEEDED]= Math.ceil(PROPELLER.P1 / MAX_CYCLE_OUTPUT)
  console.log(`[PROPELLER] P1 active | ${fB(PROPELLER.P1)}/day`)
}
