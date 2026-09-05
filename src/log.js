// src/log.js — RESONANCE diagnostics
// 5 logs per minute (every 12s)
// Starts 15s after boot — no dynamic imports — all top-level
// Zero emojis. Zero emoji warning signs.

import { existsSync, readFileSync } from 'fs'
import { ethers }                   from 'ethers'
import {
  H, SYSTEM, CODENAME, VERSION, MODEL,
  EXECUTOR, CONTRACT, CHAINS, CHAIN_HOT,
  BASE_FLASH, AMPLIFIER_OUTPUT, MAX_CYCLE_OUTPUT,
  PROPELLER, ACTIVE_PROPELLER, MAX_CYCLES_DAY,
  RESONANCE_DIMENSIONS,
} from './config.js'
import { amplify, layerBreakdown } from './amplifier.js'
import { getDimensionReport }      from './resonance.js'
import { getProjection }           from './beyond.js'
import { getCycleStats }           from './cycles.js'
import { getShadowStats }          from './shadow.js'
import { getSecurityStatus }       from './security.js'

const ADDR_PATH = '/data/resonance_contracts.json'
const SEP       = '─'.repeat(60)
let   diagCount = 0
let   diagTimer = null

function fB(n) {
  if (!n || isNaN(n) || n === 0) return '$0'
  const x = Number(n)
  if (x >= 1e27) return '$' + (x/1e27).toFixed(2) + 'OCT'
  if (x >= 1e24) return '$' + (x/1e24).toFixed(2) + 'SEPT'
  if (x >= 1e21) return '$' + (x/1e21).toFixed(2) + 'SEXT'
  if (x >= 1e18) return '$' + (x/1e18).toFixed(2) + 'QUINT'
  if (x >= 1e15) return '$' + (x/1e15).toFixed(2) + 'Q'
  if (x >= 1e12) return '$' + (x/1e12).toFixed(2) + 'T'
  if (x >= 1e9)  return '$' + (x/1e9).toFixed(2)  + 'B'
  if (x >= 1e6)  return '$' + (x/1e6).toFixed(2)  + 'M'
  return '$' + x.toFixed(2)
}

function fmtTime(s) {
  s = s | 0
  if (s < 60)   return s + 's'
  if (s < 3600) return (s/60|0) + 'm ' + (s%60) + 's'
  return (s/3600|0) + 'h ' + (s%3600/60|0) + 'm'
}

function memDiag() {
  const m     = process.memoryUsage()
  const heap  = Math.round(m.heapUsed  / 1024 / 1024)
  const total = Math.round(m.heapTotal / 1024 / 1024)
  const rss   = Math.round(m.rss       / 1024 / 1024)
  const pct   = Math.round(heap / total * 100)
  return { heap, total, rss, pct, warn: pct > 85 }
}

function contractDiag() {
  const entries = Object.entries(CONTRACT)
  let deployed = 0
  const missing = []
  for (const [key, val] of entries) {
    if (val && ethers.isAddress(val)) deployed++
    else missing.push(key)
  }
  let savedAt = null
  try {
    if (existsSync(ADDR_PATH)) {
      const d = JSON.parse(readFileSync(ADDR_PATH, 'utf8'))
      if (d.deployedAt) savedAt = new Date(d.deployedAt).toLocaleTimeString()
    }
  } catch {}
  return { deployed, total: entries.length, missing: missing.slice(0,3), savedAt }
}

function chainDiag(HOT) {
  const on = [], off = []
  for (const c of CHAINS) {
    const slot = CHAIN_HOT[c.name]
    if (slot !== undefined && HOT[slot] === 1) on.push(c.name)
    else off.push(c.name)
  }
  return { on, off, total: CHAINS.length }
}

function runDiag(HOT) {
  diagCount++
  const time   = new Date().toISOString().slice(11,19)
  const uptime = HOT[H.UPTIME] | 0
  const mem    = memDiag()
  const ctrs   = contractDiag()
  const chains = chainDiag(HOT)
  const amp    = amplify(BASE_FLASH, HOT[H.RESONANCE_MULT] || 1)
  const proj   = getProjection()
  const cycles = getCycleStats()
  const shadow = getShadowStats(HOT)
  const sec    = getSecurityStatus()

  const resonanceScore = HOT[H.RESONANCE_SCORE] | 0
  const resonanceMult  = HOT[H.RESONANCE_MULT]  | 0
  const gasPrice       = HOT[H.GAS_PRICE] || 0
  const gasOK          = HOT[H.GAS_OK] === 1

  console.log(`\n[DIAG #${diagCount}] ${SYSTEM} (${CODENAME}) v${VERSION} Model ${MODEL} | ${time} | up: ${fmtTime(uptime)}`)
  console.log(SEP)

  // 1. MEMORY
  const memStatus = mem.pct > 85 ? 'WARNING' : mem.pct > 70 ? 'MODERATE' : 'OK'
  console.log(
    `[MEM]  ${mem.heap}MB/${mem.total}MB heap (${mem.pct}%) ${memStatus}` +
    ` | rss: ${mem.rss}MB` +
    (mem.warn ? ' | WARNING: near Railway limit' : '')
  )

  // 2. CONTRACTS
  if (ctrs.deployed === ctrs.total) {
    console.log(`[CTRS] ALL ${ctrs.total}/30 deployed${ctrs.savedAt ? ' ('+ctrs.savedAt+')' : ''}`)
  } else {
    console.log(`[CTRS] ${ctrs.deployed}/${ctrs.total} deployed | Awaiting 0.1 POL at ${EXECUTOR.slice(0,14)}...`)
    if (ctrs.missing.length) console.log(`[CTRS] Missing (first 3): ${ctrs.missing.join(', ')}`)
  }

  // 3. CHAINS
  if (chains.off.length === 0) {
    console.log(`[CHN]  ALL ${chains.total}/20 connected`)
  } else {
    console.log(`[CHN]  ${chains.on.length}/20 connected${chains.off.length<5?' | offline: '+chains.off.join(','):''}`)
  }

  // 4. RESONANCE FIELD
  const dimReport  = getDimensionReport(HOT)
  const alignedDims= dimReport.filter(d => d.aligned).map(d => d.name)
  const maxEvents  = HOT[H.MAX_RESONANCE_EVENTS] | 0
  console.log(
    `[RSON] Score: ${resonanceScore}/10 | Multiplier: ${resonanceMult}x | ` +
    `Max events: ${maxEvents} | Aligned: ${alignedDims.join(',') || 'none'}`
  )

  // 5. AMPLIFIER
  console.log(
    `[AMP]  Output: ${fB(amp.output)} | Max (x10): ${fB(MAX_CYCLE_OUTPUT)} | ` +
    `25 layers | ${amp.elapsed_ms.toFixed(4)}ms`
  )

  // 6. CYCLES + REVENUE
  const natToday = HOT[H.NATURAL_TODAY] | 0
  console.log(
    `[CYC]  Today: ${cycles.today.toLocaleString()} | Total: ${cycles.total.toLocaleString()} | ` +
    `Max: ${MAX_CYCLES_DAY.toLocaleString()} | ${cycles.pctToMax}% utilized`
  )
  console.log(
    `[REV]  Today: ${fB(HOT[H.REV_TODAY])} | Net: ${fB(HOT[H.NET_TODAY])} | ` +
    `All-time: ${fB(HOT[H.REV_TOTAL])}`
  )

  // 7. BEYOND (P10 projection)
  const prop = 'P' + (HOT[H.PROPELLER] | 0)
  console.log(
    `[PROP] ${prop} | Target: ${fB(HOT[H.DAILY_TARGET])}/day | ` +
    `P10 daily: ${fB(proj.P10_DAILY)} | P10 annual: ${fB(proj.P10_ANNUAL)}`
  )

  // 8. SHADOW + GAS
  console.log(
    `[SHAD] Routes: ${shadow.shadowRoutes} | Fragments: ${shadow.fragmentsTotal} | ` +
    `Throttles: ${shadow.throttleEvents} | Treasury: CLASSIFIED`
  )
  const gasStr = gasOK
    ? `${gasPrice.toFixed(1)} gwei (OK)`
    : `${gasPrice.toFixed(1)} gwei (PAUSED — exceeds 1000 cap)`
  console.log(`[GAS]  ${gasStr} | Cap: 1000 gwei`)

  // 9. EXECUTOR
  const successRate = HOT[H.EXEC_TODAY] > 0
    ? Math.round(HOT[H.SUCCESS_TODAY] / HOT[H.EXEC_TODAY] * 100)
    : 0
  console.log(
    `[EXEC] Gas: ${gasStr.split(' ')[0]} | Cycles: ${HOT[H.CYCLES_TODAY]|0} | ` +
    `Success: ${successRate}% | Speed: ${(HOT[H.EXEC_SPEED_MS]||1).toFixed(1)}ms`
  )

  // WARNINGS — no emojis
  if (mem.warn)
    console.log('[WARNING] Memory above 85% — Railway container may restart')
  if (!gasOK)
    console.log(`[WARNING] Executor paused — gas ${gasPrice.toFixed(1)} gwei exceeds 1000 cap`)
  if (natToday > 1000 && (HOT[H.CYCLES_TODAY]|0) === 0 && ctrs.deployed < 30)
    console.log('[WARNING] Swaps detected but 0 cycles — contracts pending deployment')
  if (HOT[H.RESERVE_ARMED] === 1)
    console.log('[WARNING] Reserve is ARMED — $100T reserve mode active')
  if (HOT[H.ECOSYSTEM_THROTTLE] === 1)
    console.log('[WARNING] Ecosystem throttle active — extraction rate reduced')

  console.log(SEP)
}

export function startLogger(HOT) {
  console.log('[LOG] Diagnostics starting in 15s')
  setTimeout(() => {
    console.log(`\n[LOG] Diagnostic system active | 5/min | ${SYSTEM} ${CODENAME}`)
    runDiag(HOT)
    diagTimer = setInterval(() => runDiag(HOT), 12_000)
  }, 15_000)
}

export function stopLogger() {
  if (diagTimer) { clearInterval(diagTimer); diagTimer = null }
}
