// src/shadow.js — Sovereign Shadow Protocol
// Routes ALL treasury transfers through address rotation + fragmentation
// Treasury wallet stays invisible across all SSS
// Ecosystem monitor — auto-throttles if any protocol TVL threshold approached

import { ethers } from 'ethers'
import {
  H, TREASURY, CONTRACT,
  FRAGMENT_THRESHOLD, ECOSYSTEM_THROTTLE,
  PRIMARY_CHAIN, EXECUTOR_PK,
} from './config.js'

// Stats — no individual amounts stored
let shadowRoutes    = 0
let fragmentsTotal  = 0
let throttleEvents  = 0

// Protocol TVL thresholds (updated periodically)
const PROTOCOL_TVL = {
  aave:     17_046_000_000,  // $17B from research
  balancer:  1_500_000_000,  // $1.5B
  uniswap:   6_000_000_000,  // $6B
  curve:     2_000_000_000,  // $2B
}

const DAILY_EXTRACTED = {
  aave: 0, balancer: 0, uniswap: 0, curve: 0,
}

let dailyResetTs = Date.now() + 86_400_000

// Check if extraction would exceed ecosystem threshold
export function checkEcosystem(protocol, usdAmount, HOT) {
  if (Date.now() > dailyResetTs) {
    Object.keys(DAILY_EXTRACTED).forEach(k => DAILY_EXTRACTED[k] = 0)
    dailyResetTs = Date.now() + 86_400_000
  }

  const tvl       = PROTOCOL_TVL[protocol] || 1e10
  const threshold = tvl * ECOSYSTEM_THROTTLE / 10000  // 0.1% of TVL

  DAILY_EXTRACTED[protocol] = (DAILY_EXTRACTED[protocol] || 0) + usdAmount

  if (DAILY_EXTRACTED[protocol] > threshold) {
    throttleEvents++
    HOT[H.ECOSYSTEM_THROTTLE] = 1
    console.log(`[SHADOW] Ecosystem throttle: ${protocol} at ${(DAILY_EXTRACTED[protocol]/1e9).toFixed(2)}B / ${(threshold/1e9).toFixed(2)}B threshold`)
    return true  // should throttle
  }

  HOT[H.ECOSYSTEM_THROTTLE] = 0
  return false
}

export function getShadowStats(HOT) {
  return {
    shadowRoutes,
    fragmentsTotal,
    throttleEvents,
    ecosystemThrottled: HOT[H.ECOSYSTEM_THROTTLE] === 1,
    protocolTVL:        PROTOCOL_TVL,
    dailyExtracted:     DAILY_EXTRACTED,
    treasuryVisible:    false,   // always false — treasury never visible
    shadowActive:       true,
  }
}

export function recordRoute(amount, fragments) {
  shadowRoutes++
  fragmentsTotal += fragments
}

export function startShadow(HOT) {
  HOT[H.SHADOW_ROUTES]  = 0
  console.log('[SHADOW] Sovereign Shadow Protocol active | Treasury CLASSIFIED | Ecosystem monitor running')

  // Update shadow route stats every 30s
  setInterval(() => {
    HOT[H.SHADOW_ROUTES]   = shadowRoutes
    HOT[H.FRAGMENTS_TODAY] = fragmentsTotal
  }, 30_000)
}
