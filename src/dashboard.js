// src/dashboard.js — RESONANCE dashboard server
// 30 tabs | Obsidian + Electric Blue + White
// WebSocket 500ms | FTW | Amplifier tuning | Reserve control
// Shadow status | All 10 resonance dimensions

import { createRequire }  from 'module'
import { createServer }   from 'http'
import { existsSync }     from 'fs'
import { fileURLToPath }  from 'url'
import path               from 'path'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const _req  = createRequire(import.meta.url)
const express             = _req(path.join(__dir,'../node_modules/express'))
const { WebSocketServer } = _req(path.join(__dir,'../node_modules/ws'))

import {
  H, PORT, SYSTEM, CODENAME, VERSION, MODEL,
  EXECUTOR, CONTRACT, CHAINS, CHAIN_HOT,
  BASE_FLASH, AMPLIFIER_OUTPUT, MAX_CYCLE_OUTPUT,
  PROPELLER, PROPELLER_ANNUAL, DAILY_TARGET,
  MAX_CYCLES_DAY, RESONANCE_DIMENSIONS,
} from './config.js'
import { activatePropeller, getPropellerStats, getProgress, getVelocity } from './propeller.js'
import { getCycleLog, getDailyStats }                                      from './treasury.js'
import { layerBreakdown, updateLayer }                                     from './amplifier.js'
import { getDimensionReport }                                               from './resonance.js'
import { getProjection }                                                    from './beyond.js'
import { getCycleStats }                                                    from './cycles.js'
import { getShadowStats }                                                   from './shadow.js'
import { getSecurityStatus }                                                from './security.js'
import { send as mpSend, calcFee }                                          from './adapters/modempay.js'

let SAB_REF = null
const WS_CLIENTS = new Set()
const hot = () => SAB_REF ? new Float64Array(SAB_REF) : null

function fullState() {
  const H2 = hot()
  if (!H2) return { type:'state', ts:Date.now(), booting:true }

  const v    = getVelocity(H2)
  const p    = getProgress(H2)
  const proj = getProjection()
  const dim  = getDimensionReport(H2)
  const cyc  = getCycleStats()
  const shad = getShadowStats(H2)
  const sec  = getSecurityStatus()

  return {
    type:'state', ts:Date.now(),
    // Core
    system:SYSTEM, codename:CODENAME, version:VERSION, model:MODEL,
    // Cycles + Revenue
    cyclesToday:    H2[H.CYCLES_TODAY]   |0,
    cyclesTotal:    H2[H.CYCLES_TOTAL]   |0,
    cyclesNeeded:   H2[H.CYCLES_NEEDED]  |0,
    maxCyclesDay:   MAX_CYCLES_DAY,
    naturalToday:   H2[H.NATURAL_TODAY]  |0,
    execToday:      H2[H.EXEC_TODAY]     |0,
    successToday:   H2[H.SUCCESS_TODAY]  |0,
    failToday:      H2[H.FAIL_TODAY]     |0,
    revToday:       H2[H.REV_TODAY],
    revTotal:       H2[H.REV_TOTAL],
    netToday:       H2[H.NET_TODAY],
    aaveFeeToday:   H2[H.AAVE_FEE_TODAY],
    perCycle:       H2[H.PER_CYCLE],
    peakCycle:      H2[H.PEAK_CYCLE],
    avgCycle:       H2[H.AVG_CYCLE],
    velocity:       v,
    progress:       p,
    // Resonance field
    resonanceScore: H2[H.RESONANCE_SCORE]      |0,
    resonanceMult:  H2[H.RESONANCE_MULT]       |0,
    resonanceEvents:H2[H.RESONANCE_EVENTS]     |0,
    maxResEvents:   H2[H.MAX_RESONANCE_EVENTS] |0,
    dimensions:     dim,
    // Amplifier
    ampOutput:      H2[H.AMP_OUTPUT],
    maxOutput:      MAX_CYCLE_OUTPUT,
    ampLayers:      layerBreakdown(),
    // Beyond / Propeller
    propeller:      'P' + (H2[H.PROPELLER]|0),
    propellerNum:   H2[H.PROPELLER]|0,
    dailyTarget:    H2[H.DAILY_TARGET],
    propellerStats: getPropellerStats(),
    projection:     proj,
    beyondActive:   H2[H.BEYOND_ACTIVE] === 1,
    // Shadow
    shadow:         shad,
    shadowRoutes:   H2[H.SHADOW_ROUTES]  |0,
    fragments:      H2[H.FRAGMENTS_TODAY]|0,
    ecosystemThrottle: H2[H.ECOSYSTEM_THROTTLE] === 1,
    // Reserve
    reserveArmed:   H2[H.RESERVE_ARMED] === 1,
    // Chains
    chainCount:     H2[H.CHAIN_COUNT]|0,
    chainStates:    Object.fromEntries(
      CHAINS.map(c => [c.name, H2[H['C_'+c.name.toUpperCase()]]===1])
    ),
    // Gas
    gasPrice:       H2[H.GAS_PRICE],
    gasOK:          H2[H.GAS_OK] === 1,
    // System
    contracts:      H2[H.CONTRACTS]  |0,
    deployment:     H2[H.DEPLOYMENT] ===1,
    uptime:         H2[H.UPTIME]     |0,
    mb:             H2[H.MB]         |0,
    executor:       EXECUTOR,
    contracts_:     CONTRACT,
    security:       sec,
    cycleStats:     cyc,
    dailyStats:     getDailyStats(),
    wsClients:      WS_CLIENTS.size,
    // TREASURY NEVER INCLUDED
  }
}

function broadcast(data) {
  const p = JSON.stringify(data)
  for (const ws of WS_CLIENTS) {
    if (ws.readyState===1) try { ws.send(p) } catch { WS_CLIENTS.delete(ws) }
  }
}
setInterval(() => { if (WS_CLIENTS.size > 0) broadcast(fullState()) }, 500)

const app = express()
const srv = createServer(app)
const wss = new WebSocketServer({ server:srv, perMessageDeflate:false })

app.use(express.json({ limit:'1mb' }))
app.use(express.static(path.join(__dir,'../dashboard')))

app.get('/', (_, res) => {
  const p = path.join(__dir,'../dashboard/obelisk.html')
  existsSync(p) ? res.sendFile(p) : res.status(404).send('obelisk.html missing')
})

app.get('/ping', (_, res) => {
  const H2 = hot()
  res.json({ ok:true, system:SYSTEM, codename:CODENAME, uptime:H2?.[H.UPTIME]|0 })
})

// API
app.get('/api/state',  (_, res) => res.json(fullState()))
app.get('/api/cycles', (req, res) => {
  const limit = parseInt(req.query.limit)||100
  res.json({ cycles:getCycleLog(limit), daily:getDailyStats(), total:hot()?.[H.CYCLES_TOTAL]|0 })
})
app.get('/api/projection', (_, res) => res.json(getProjection()))
app.get('/api/dimensions', (_, res) => {
  const H2=hot(); res.json({ dimensions:getDimensionReport(H2||new Float64Array(8192)) })
})

// Propeller
app.post('/api/propeller', (req, res) => {
  const { level } = req.body
  const H2 = hot(); if (!H2) return res.status(503).json({ error:'not ready' })
  const ok = activatePropeller(level, H2)
  res.json({ ok, level, target:PROPELLER[level] })
})

// Executor
app.post('/api/executor/pause',  (req, res) => {
  const H2=hot();if(!H2)return res.status(503).json({error:'not ready'})
  H2[H.GAS_OK]=0;res.json({ok:true,status:'paused'})
})
app.post('/api/executor/resume', (req, res) => {
  const H2=hot();if(!H2)return res.status(503).json({error:'not ready'})
  H2[H.GAS_OK]=1;res.json({ok:true,status:'resumed'})
})

// Amplifier tuning
app.post('/api/amplifier/layer', (req, res) => {
  const { layerId, mult, div } = req.body
  const ok = updateLayer(layerId, mult, div)
  res.json({ ok, layers:layerBreakdown() })
})

// Shadow control
app.post('/api/shadow/toggle', (req, res) => {
  res.json({ ok:true, msg:'Shadow always active — treasury protection cannot be disabled' })
})

// FTW
app.post('/api/ftw/quote', (req, res) => {
  const { amount, network } = req.body
  if (!amount) return res.status(400).json({ error:'amount required' })
  res.json({ ...calcFee(parseFloat(amount), network||'wave'), ts:Date.now() })
})

app.post('/api/ftw/withdraw', async (req, res) => {
  const { amount, type, phone, accountNumber, accountName, swiftCode, network, address } = req.body
  if (!amount||amount<=0) return res.status(400).json({ error:'amount required' })
  const key = process.env.MODEMPAY_SECRET_KEY||''
  if (!key) return res.status(400).json({ error:'MODEMPAY_SECRET_KEY not set' })
  try {
    const result = await mpSend(key, { type, amount:parseFloat(amount), phone, accountNumber, accountName, swiftCode, network, address })
    broadcast({ type:'ftw', amount })
    res.json({ ok:true, ...result })
  } catch (e) { res.status(500).json({ error:e.message?.slice(0,120) }) }
})

// WebSocket
wss.on('connection', ws => {
  WS_CLIENTS.add(ws)
  ws.send(JSON.stringify(fullState()))
  ws.on('close', () => WS_CLIENTS.delete(ws))
  ws.on('error', () => WS_CLIENTS.delete(ws))
})

export function startDashboard(SAB) {
  SAB_REF = SAB
  srv.listen(PORT, () => {
    console.log(`[DASHBOARD] RESONANCE JUPITERR :${PORT} | 30 tabs | obsidian theme | /ping`)
  })
}
