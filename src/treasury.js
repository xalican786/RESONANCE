// src/treasury.js — RESONANCE treasury audit
// Per-cycle records with resonance score
// Shared treasury — classified — never logged

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { H } from './config.js'

const LOG_PATH = '/data/resonance_cycles.json'
let   cycleLog = []

export function recordCycleLog(data) {
  cycleLog.push({
    ts:            Date.now(),
    extracted:     data.extracted,
    net:           data.net,
    txHash:        data.txHash,
    elapsed_ms:    data.elapsed_ms,
    resonanceMult: data.resonanceMult || 1,
    cycleId:       data.cycleId,
  })
  if (cycleLog.length % 1000 === 0) saveLog()
}

function saveLog() {
  try {
    if (!existsSync('/data')) mkdirSync('/data',{recursive:true})
    writeFileSync(LOG_PATH, JSON.stringify(cycleLog.slice(-10_000)))
  } catch {}
}

export function getCycleLog(limit = 100) { return cycleLog.slice(-limit) }

export function getDailyStats() {
  const today = new Date().toDateString()
  const logs  = cycleLog.filter(e => new Date(e.ts).toDateString() === today)
  return {
    count:         logs.length,
    revenue:       logs.reduce((s,e) => s + (e.extracted||0), 0),
    net:           logs.reduce((s,e) => s + (e.net||0), 0),
    avgMs:         logs.length ? logs.reduce((s,e) => s+(e.elapsed_ms||0),0)/logs.length : 0,
    avgResonance:  logs.length ? logs.reduce((s,e) => s+(e.resonanceMult||1),0)/logs.length : 0,
    maxResonance:  logs.reduce((m,e) => Math.max(m, e.resonanceMult||1), 0),
  }
}

export function startTreasury(HOT) {
  try {
    if (existsSync(LOG_PATH)) {
      cycleLog = JSON.parse(readFileSync(LOG_PATH,'utf8'))
      console.log(`[TREASURY] Loaded ${cycleLog.length} cycle records`)
    }
  } catch {}
  setInterval(saveLog, 30_000)
  console.log('[TREASURY] Shared treasury | CLASSIFIED | resonance-aware audit active')
}
