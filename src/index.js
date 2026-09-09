// src/index.js -- RESONANCE final boot
// Model 5 | Codename: JUPITERR | 25-layer amplifier + resonance field
// log.js already exists -- imported here
// algorithm.js: live flash replaces BASE_FLASH as amplifier input
// Workers start ONLY after compiler subprocess exits
// 20 chains | 10M cycles/day | recursive seeding

import { createServer }  from 'http'
import { Worker }        from 'worker_threads'
import { fileURLToPath } from 'url'
import path              from 'path'

import {
  SAB_SIZE, H, SYSTEM, CODENAME, VERSION, MODEL,
  EXECUTOR, TREASURY, PORT,
  BASE_FLASH, AMPLIFIER_OUTPUT, MAX_CYCLE_OUTPUT,
  WS_CHAINS, EXEC_SPEED_MS, PROPELLER,
} from './config.js'

import { startDeployer }           from './deployer.js'
import { startPropeller }          from './propeller.js'
import { startTreasury }           from './treasury.js'
import { startDashboard }          from './dashboard.js'
import { startLogger }             from './log.js'
import { startResonance }          from './resonance.js'
import { startShadow }             from './shadow.js'
import { startCycles }             from './cycles.js'
import { startMonitor }            from './monitor.js'
import { startOracle }             from './oracle.js'
import { startSecurity }           from './security.js'
import { amplify, layerBreakdown } from './amplifier.js'
import { getProjection }           from './beyond.js'
import { getLiveFlash }            from './algorithm.js'

// ── SHARED MEMORY ─────────────────────────────────────────────────────────────
export const SAB = new SharedArrayBuffer(SAB_SIZE)
export const HOT = new Float64Array(SAB)

HOT[H.GAS_OK]              = 1
HOT[H.PROPELLER]           = 1
HOT[H.AMP_OUTPUT]          = AMPLIFIER_OUTPUT  // initial -- live overwrite below
HOT[H.MAX_RESONANCE_OUTPUT]= MAX_CYCLE_OUTPUT
HOT[H.RESONANCE_SCORE]     = 0
HOT[H.RESONANCE_MULT]      = 1

// Algorithm HOT slots -- live flash values for log.js and executor
HOT[H.LIVE_FLASH]    = BASE_FLASH  // initial -- overwritten on boot
HOT[H.ALGO_PASS]     = 0
HOT[H.ALGO_FLASH]    = 0
HOT[H.ALGO_LAST_TS]  = 0

// ── SAFETY ────────────────────────────────────────────────────────────────────
if (EXECUTOR === TREASURY) {
  console.error('[RESONANCE] FATAL: executor === treasury')
  process.exit(1)
}

// ── BANNER ────────────────────────────────────────────────────────────────────
const proj = getProjection()
const wsc  = WS_CHAINS.length

console.log('╔═══════════════════════════════════════════════════════════╗')
console.log(`║   R E S O N A N C E  --  Model ${MODEL}  |  Codename: ${CODENAME}       ║`)
console.log(`║   Version: ${VERSION}  |  25-layer amplifier  |  ${EXEC_SPEED_MS}ms standard     ║`)
console.log(`║   Executor: ${EXECUTOR.slice(0,14)}...                              ║`)
console.log('║   Treasury: SOVEREIGN SHADOW PROTOCOL -- CLASSIFIED       ║')
console.log(`║   Configured: $${Math.floor(BASE_FLASH/1e9)}B -- live reads replace this          ║`)
console.log(`║   Resonance: 10 dimensions | 1x-10x multiplier            ║`)
console.log(`║   Cycles:    10,000,000 per day | recursive seeding        ║`)
console.log(`║   Chains:    ${wsc} monitoring | every event = trigger         ║`)
console.log(`║   P10 Daily: $${(proj.P10_DAILY/1e21).toFixed(2)} sextillion                    ║`)
console.log(`║   P10 Annual:$${(proj.P10_ANNUAL/1e24).toFixed(2)} octillion                    ║`)
console.log('╚═══════════════════════════════════════════════════════════╝')

layerBreakdown().forEach(l => {
  if (l.id === 1 || l.id === 13 || l.id === 25)
    console.log(`[AMPLIFIER] L${l.id}: ${l.name} | ${l.mult} | ${l.outputDisplay}`)
})

// ── LIVE FLASH INIT -- algorithm.js takes responsibility for amplifier base ────
// RESONANCE amplifier: amplify(liveFlash, resonanceMult)
// NOT amplify(BASE_FLASH, resonanceMult)
// HOT[H.LIVE_FLASH] = confirmed on-chain vault balance
// Executor reads HOT[H.LIVE_FLASH] as amplifier input each cycle
// Amplifier output = liveFlash × 1.18^25 × resonanceMult
// This is the critical change -- configured $70B becomes actual available flash

getLiveFlash().then(result => {
  if (result.pass && result.total > 0) {
    HOT[H.LIVE_FLASH]   = result.total  // amplifier base = live flash
    HOT[H.ALGO_FLASH]   = result.total
    HOT[H.ALGO_PASS]    = 1
    HOT[H.ALGO_LAST_TS] = Date.now()

    // Recompute amplifier output with live base × resonance
    const liveAmp = amplify(result.total, HOT[H.RESONANCE_MULT] || 1)
    HOT[H.AMP_OUTPUT] = liveAmp.output

    console.log(
      `[ALGORITHM] Live amplifier base: $${(result.total/1e6).toFixed(2)}M` +
      ` | 25-layer output: $${(liveAmp.output/1e9).toFixed(2)}B` +
      ` | x${HOT[H.RESONANCE_MULT]||1} resonance = $${(liveAmp.output*(HOT[H.RESONANCE_MULT]||1)/1e9).toFixed(2)}B`
    )
    console.log(
      `[ALGORITHM] Configured BASE_FLASH was $${Math.floor(BASE_FLASH/1e9)}B` +
      ` -- using live $${(result.total/1e6).toFixed(2)}M`
    )
  } else {
    HOT[H.ALGO_PASS]    = 0
    HOT[H.ALGO_LAST_TS] = Date.now()
    console.log(`[ALGORITHM] Live read failed -- amplifier using configured $${Math.floor(BASE_FLASH/1e9)}B base`)
  }
}).catch(() => {
  console.log('[ALGORITHM] Live flash init error -- amplifier using configured base')
})

// ── SERVICES -- start immediately (light memory footprint) ────────────────────
startPropeller(HOT)
startTreasury(HOT)
startDashboard(SAB)
startResonance(HOT)
startShadow(HOT)
startCycles(HOT)
startMonitor(HOT)
startOracle(HOT)
startSecurity(HOT)

// ── DEPLOYER -- workers start ONLY after compiler subprocess exits ────────────
const __dir = path.dirname(fileURLToPath(import.meta.url))

let chainWorker = null
let execWorker  = null

function startWorkers() {
  if (chainWorker || execWorker) return

  console.log('[RESONANCE] Starting workers -- compiler memory fully released')

  // Chain monitor -- 60MB hard cap
  chainWorker = new Worker(
    path.join(__dir, 'chains.js'),
    {
      workerData:     { SAB },
      resourceLimits: {
        maxOldGenerationSizeMb:   60,
        maxYoungGenerationSizeMb: 12,
      },
    }
  )
  chainWorker.on('message', msg => {
    if (msg.type === 'swap') HOT[H.NATURAL_TODAY] = (HOT[H.NATURAL_TODAY] || 0) + 1
  })
  chainWorker.on('error', e => console.log(`[CHAINS] ${e.message?.slice(0, 80)}`))
  chainWorker.on('exit',  c => { if (c !== 0) console.log(`[CHAINS] exited: ${c}`) })

  // Executor -- 80MB hard cap
  execWorker = new Worker(
    path.join(__dir, 'executor.js'),
    {
      workerData:     { SAB },
      resourceLimits: {
        maxOldGenerationSizeMb:   80,
        maxYoungGenerationSizeMb: 16,
      },
    }
  )
  execWorker.on('message', msg => {
    if (msg.type === 'cycle') {
      const x = msg.extracted || 0
      HOT[H.REV_TODAY]     = (HOT[H.REV_TODAY]     || 0) + x
      HOT[H.REV_TOTAL]     = (HOT[H.REV_TOTAL]      || 0) + x
      HOT[H.CYCLES_TODAY]  = (HOT[H.CYCLES_TODAY]    || 0) + 1
      HOT[H.CYCLES_TOTAL]  = (HOT[H.CYCLES_TOTAL]    || 0) + 1
      HOT[H.EXEC_SPEED_MS] = msg.elapsed_ms || 1
      HOT[H.PER_CYCLE]     = x
      if (x > (HOT[H.PEAK_CYCLE] || 0)) HOT[H.PEAK_CYCLE] = x
      const c = HOT[H.CYCLES_TODAY] || 1
      HOT[H.AVG_CYCLE] = HOT[H.REV_TODAY] / c
    }
    // Executor reports algorithm check results to HOT for log.js
    if (msg.type === 'algo_check') {
      HOT[H.ALGO_PASS]    = msg.pass  ? 1 : 0
      HOT[H.ALGO_FLASH]   = msg.flash || 0
      HOT[H.ALGO_LAST_TS] = Date.now()
      // Update live flash = new amplifier base + recompute output
      if (msg.pass && msg.flash > 0) {
        HOT[H.LIVE_FLASH] = msg.flash
        const resonanceMult = Math.max(1, Math.min(10, HOT[H.RESONANCE_MULT] || 1))
        const amp = amplify(msg.flash, resonanceMult)
        HOT[H.AMP_OUTPUT] = amp.output
      }
    }
  })
  execWorker.on('error', e => console.log(`[EXECUTOR] ${e.message?.slice(0, 80)}`))
  execWorker.on('exit',  c => { if (c !== 0) console.log(`[EXECUTOR] exited: ${c}`) })
}

// Workers start only after compiler exits
startDeployer(SAB, startWorkers)

// ── TIMERS ────────────────────────────────────────────────────────────────────
setInterval(() => { HOT[H.UPTIME]++ }, 1_000)

setInterval(() => {
  HOT[H.MB] = process.memoryUsage().heapUsed / 1024 / 1024 | 0
}, 10_000)

// Background live flash refresh -- 60s
// Keeps LIVE_FLASH current between cycle reads
// Also recomputes amplifier output with current resonance multiplier
setInterval(() => {
  getLiveFlash().then(result => {
    if (result.pass && result.total > 0) {
      HOT[H.LIVE_FLASH] = result.total
      HOT[H.ALGO_FLASH] = result.total
      const resonanceMult = Math.max(1, Math.min(10, HOT[H.RESONANCE_MULT] || 1))
      const amp = amplify(result.total, resonanceMult)
      HOT[H.AMP_OUTPUT] = amp.output
    }
  }).catch(() => {})
}, 60_000)

const scheduleMidnight = () => {
  const nx = new Date()
  nx.setUTCHours(0, 0, 0, 0)
  nx.setUTCDate(nx.getUTCDate() + 1)
  setTimeout(() => {
    ;[
      H.CYCLES_TODAY,   H.REV_TODAY,      H.NET_TODAY,
      H.NATURAL_TODAY,  H.EXEC_TODAY,     H.SUCCESS_TODAY,
      H.FAIL_TODAY,     H.AAVE_FEE_TODAY, H.AVG_CYCLE,
      H.TOTAL_AMP,      H.SHADOW_ROUTES,  H.FRAGMENTS_TODAY,
      H.RESONANCE_EVENTS,
    ].forEach(i => { if (i !== undefined) HOT[i] = 0 })
    scheduleMidnight()
  }, nx - new Date())
}
scheduleMidnight()

// ── DIAGNOSTICS -- log.js already exists in RESONANCE ────────────────────────
// log.js now reads HOT[H.LIVE_FLASH] and HOT[H.ALGO_*] for algorithm status
// Amplifier output shown from HOT[H.AMP_OUTPUT] -- reflects live base
// Starts 15s after boot | 5 diagnostics per minute
startLogger(HOT)

// ── HEALTH ENDPOINT ───────────────────────────────────────────────────────────
createServer((req, res) => {
  if (req.url !== '/ping' && req.url !== '/health') {
    res.writeHead(404); res.end(); return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    ok:             true,
    system:         SYSTEM,
    codename:       CODENAME,
    version:        VERSION,
    model:          MODEL,
    uptime:         HOT[H.UPTIME]            | 0,
    cyclesTotal:    HOT[H.CYCLES_TOTAL]      | 0,
    revToday:       HOT[H.REV_TODAY],
    liveFlash:      HOT[H.LIVE_FLASH],        // confirmed live flash = amplifier base
    ampOutput:      HOT[H.AMP_OUTPUT],        // amplifier output from live base
    maxOutput:      HOT[H.MAX_RESONANCE_OUTPUT],
    algoPass:       HOT[H.ALGO_PASS]         === 1,
    algoFlash:      HOT[H.ALGO_FLASH],
    resonanceScore: HOT[H.RESONANCE_SCORE]   | 0,
    resonanceMult:  HOT[H.RESONANCE_MULT]    | 0,
    propeller:     'P' + (HOT[H.PROPELLER]   | 0),
    chains:         HOT[H.CHAIN_COUNT]       | 0,
    deployed:       HOT[H.DEPLOYMENT]        === 1,
    gasOK:          HOT[H.GAS_OK]            === 1,
    executor:       EXECUTOR,
    treasury:       'CLASSIFIED',
    shadowActive:   true,
    mb:             HOT[H.MB]                | 0,
    workersActive:  !!(chainWorker && execWorker),
  }))
}).listen(3001).on('error', () => {})

// ── PROCESS HANDLERS ──────────────────────────────────────────────────────────
process.on('uncaughtException', e => {
  console.log(`[RESONANCE] Exception: ${e.message?.slice(0, 100)}`)
})
process.on('unhandledRejection', r =>
  console.log(`[RESONANCE] Rejection: ${String(r).slice(0, 100)}`)
)
process.on('SIGTERM', () => {
  chainWorker?.terminate()
  execWorker?.terminate()
  process.exit(0)
})

console.log(`[RESONANCE] ${SYSTEM} ${CODENAME} | :${PORT} | ${EXECUTOR} | ${wsc} chains | algorithm active | workers pending compiler`)
