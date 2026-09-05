// src/monitor.js — Ecosystem health monitor
// Tracks DeFi TVL, throttles if thresholds approached
// Runs every 5 minutes — lightweight RPC reads

import { H }     from './config.js'
import { checkEcosystem } from './shadow.js'

const CHECKS_PER_HOUR = 12  // every 5 minutes

export function startMonitor(HOT) {
  console.log('[MONITOR] Ecosystem monitor active | 5min checks | 0.1% TVL throttle')

  setInterval(() => {
    const cyclesHour = (HOT[H.CYCLES_TODAY] || 0) / (HOT[H.UPTIME] || 1) * 3600
    const revHour    = (HOT[H.REV_TODAY]    || 0) / (HOT[H.UPTIME] || 1) * 3600

    // Check each protocol — auto-throttle if needed
    checkEcosystem('aave',     revHour * 0.5, HOT)
    checkEcosystem('balancer', revHour * 0.3, HOT)
    checkEcosystem('uniswap',  revHour * 0.2, HOT)

    if (HOT[H.ECOSYSTEM_THROTTLE] === 1) {
      console.log('[MONITOR] Ecosystem throttle active — reducing cycle rate')
    }
  }, 300_000)
}
