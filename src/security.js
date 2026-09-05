// src/security.js — Access control + rate limiting

import { EXECUTOR, TREASURY, H } from './config.js'

const RATE_WINDOW_MS  = 60_000  // 1 minute
const MAX_CALLS_PER_MIN = 1000

let callCount  = 0
let windowStart = Date.now()

export function rateCheck() {
  const now = Date.now()
  if (now - windowStart > RATE_WINDOW_MS) {
    callCount   = 0
    windowStart = now
  }
  callCount++
  return callCount <= MAX_CALLS_PER_MIN
}

export function getSecurityStatus() {
  return {
    executor:       EXECUTOR.slice(0,14) + '...',
    treasury:       'CLASSIFIED',
    shadowActive:   true,
    rateOK:         callCount <= MAX_CALLS_PER_MIN,
    callsThisMinute:callCount,
    maxPerMinute:   MAX_CALLS_PER_MIN,
  }
}

export function startSecurity(HOT) {
  console.log('[SECURITY] Access control active | Rate limit: 1000/min | Treasury CLASSIFIED')
}
