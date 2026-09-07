// src/compile.js -- RESONANCE one-shot compiler subprocess
// Hard heap cap: 250MB (set in deployer.js fork execArgv)
// Runs completely alone -- no workers active during compilation
// Exits after writing artifacts -- main process memory stays clean
// GC between every contract -- prevents accumulation

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createRequire } from 'module'
import { ethers }        from 'ethers'

const require    = createRequire(import.meta.url)
const COMP_PATH  = '/data/resonance_compiled.json'
const ADDR_PATH  = '/data/resonance_contracts.json'

const SOURCES = [
  { name:'ResonanceGovernance',   path:'./contracts/ResonanceGovernance.sol',   critical:false },
  { name:'ResonanceRegistry',     path:'./contracts/ResonanceRegistry.sol',     critical:false },
  { name:'ResonanceVault',        path:'./contracts/ResonanceVault.sol',        critical:false },
  { name:'ResonanceAudit',        path:'./contracts/ResonanceAudit.sol',        critical:false },
  { name:'ShadowVault',           path:'./contracts/ShadowVault.sol',           critical:false },
  { name:'ShadowFragmenter',      path:'./contracts/ShadowFragmenter.sol',      critical:false },
  { name:'ShadowDispatcher',      path:'./contracts/ShadowDispatcher.sol',      critical:false },
  { name:'ShadowGuardian',        path:'./contracts/ShadowGuardian.sol',        critical:false },
  { name:'ShadowRouter',          path:'./contracts/ShadowRouter.sol',          critical:true  },
  { name:'ShadowProxy',           path:'./contracts/ShadowProxy.sol',           critical:true  },
  { name:'ResonanceReserveLock',  path:'./contracts/ResonanceReserveLock.sol',  critical:false },
  { name:'ResonanceReserve',      path:'./contracts/ResonanceReserve.sol',      critical:false },
  { name:'ResonanceSplitter',     path:'./contracts/ResonanceSplitter.sol',     critical:true  },
  { name:'ResonanceBundle',       path:'./contracts/ResonanceBundle.sol',       critical:false },
  { name:'ResonanceTreasury',     path:'./contracts/ResonanceTreasury.sol',     critical:false },
  { name:'ResonanceGuard',        path:'./contracts/ResonanceGuard.sol',        critical:true  },
  { name:'ResonanceToken',        path:'./contracts/ResonanceToken.sol',        critical:false },
  { name:'ResonanceFee',          path:'./contracts/ResonanceFee.sol',          critical:false },
  { name:'ResonanceDistribution', path:'./contracts/ResonanceDistribution.sol', critical:false },
  { name:'ResonanceClock',        path:'./contracts/ResonanceClock.sol',        critical:false },
  { name:'ResonanceFieldMap',     path:'./contracts/ResonanceFieldMap.sol',     critical:false },
  { name:'ResonanceField',        path:'./contracts/ResonanceField.sol',        critical:true  },
  { name:'ResonanceOracle',       path:'./contracts/ResonanceOracle.sol',       critical:true  },
  { name:'ResonanceSentinel',     path:'./contracts/ResonanceSentinel.sol',     critical:false },
  { name:'ResonanceInfinity',     path:'./contracts/ResonanceInfinity.sol',     critical:false },
  { name:'ResonanceBeyond',       path:'./contracts/ResonanceBeyond.sol',       critical:false },
  { name:'ResonanceExecutor',     path:'./contracts/ResonanceExecutor.sol',     critical:false },
  { name:'ResonanceAmplifier',    path:'./contracts/ResonanceAmplifier.sol',    critical:true  },
  { name:'ResonanceFlash',        path:'./contracts/ResonanceFlash.sol',        critical:true  },
  { name:'Resonance',             path:'./contracts/Resonance.sol',             critical:true  },
]

// ── NON-ASCII REPLACEMENT MAP ─────────────────────────────────────────────────
// Covers every common non-ASCII character that sneaks into Solidity source
// from copy-paste, editors, or AI-generated code.
const ASCII_MAP = [
  // Smart quotes → straight quotes
  [/\u2018|\u2019|\u201A|\u201B/g, "'"],   // ' ' ‚ ‛  → '
  [/\u201C|\u201D|\u201E|\u201F/g, '"'],   // " " „ ‟  → "
  // Dashes → hyphen-minus
  [/\u2010|\u2011|\u2012|\u2013|\u2014|\u2015/g, '-'], // ‐‑‒–—― → -
  // Ellipsis
  [/\u2026/g, '...'],
  // Non-breaking and other spaces → regular space
  [/\u00A0|\u200B|\u202F|\u2009|\u2008|\u2007|\u2006|\u2005|\u2004|\u2003|\u2002|\u2001|\u2000/g, ' '],
  // Zero-width chars → remove
  [/\u200C|\u200D|\uFEFF/g, ''],
  // Multiplication sign → *
  [/\u00D7/g, '*'],
  // Division sign → /
  [/\u00F7/g, '/'],
  // Backtick variants
  [/\u2018|\u0060|\u00B4/g, '`'],
  // Any remaining non-ASCII → remove
  [/[^\x00-\x7F]/g, ''],
]

function sanitize(source) {
  let s = source
  for (const [pattern, replacement] of ASCII_MAP) {
    s = s.replace(pattern, replacement)
  }
  return s
}

function gc() {
  if (global.gc) {
    global.gc()
    global.gc()
  }
}

function send(msg) {
  try { process.send?.(msg) } catch {}
}

// name: contract name e.g. "Resonance"
// filePath: path on disk e.g. "./contracts/Resonance.sol"
function compileSingle(name, filePath) {
  if (!existsSync(filePath)) {
    send({ type: 'missing', name })
    return null
  }

  gc()

  let solc, source
  try {
    solc = require('solc')
  } catch (e) {
    send({ type: 'error', name, msg: `solc load: ${e.message?.slice(0, 40)}` })
    return null
  }

  try {
    source = readFileSync(filePath, 'utf8')
  } catch (e) {
    send({ type: 'error', name, msg: `read: ${e.message?.slice(0, 40)}` })
    return null
  }

  // Strip non-ASCII before compile — silently fixes smart quotes, em dashes, etc.
  // No warning logged; clean source is the only outcome we care about.
  source = sanitize(source)

  const input = JSON.stringify({
    language: 'Solidity',
    sources:  { [`${name}.sol`]: { content: source } },
    settings: {
      viaIR:           true,
      optimizer:       { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  })

  let out
  try {
    out = JSON.parse(solc.compile(input))
  } catch (e) {
    send({ type: 'error', name, msg: e.message?.slice(0, 100) })
    gc()
    return null
  }

  const fatals = (out.errors || []).filter(e => e.severity === 'error')
  if (fatals.length) {
    fatals.forEach(f =>
      send({ type: 'error', name, msg: f.formattedMessage?.slice(0, 160) })
    )
    out = null
    gc()
    return null
  }

  const c = out.contracts?.[`${name}.sol`]?.[name]
  if (!c?.evm?.bytecode?.object || c.evm.bytecode.object.length < 10) {
    send({ type: 'error', name, msg: 'empty bytecode' })
    out = null
    gc()
    return null
  }

  const result = { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }

  out    = null
  source = null
  gc()

  return result
}

async function main() {
  // Check existing deployment first -- skip compile if already live
  if (existsSync(ADDR_PATH)) {
    try {
      const d = JSON.parse(readFileSync(ADDR_PATH, 'utf8'))
      if (d.Resonance && ethers.isAddress(d.Resonance)) {
        send({ type: 'already_deployed', data: d })
        process.exit(0)
        return
      }
    } catch {}
  }

  send({ type: 'start', count: SOURCES.length })

  const compiled = {}

  for (const { name, path: fp, critical } of SOURCES) {
    await new Promise(r => setTimeout(r, 600))

    const result = compileSingle(name, fp)

    if (result) {
      compiled[name] = result
      send({ type: 'compiled', name })
    } else {
      if (critical) send({ type: 'critical_fail', name })
    }

    // Extra GC pause every 5 contracts
    if (Object.keys(compiled).length % 5 === 0) {
      await new Promise(r => setTimeout(r, 300))
      gc()
    }
  }

  const count = Object.keys(compiled).length
  send({ type: 'done', count, names: Object.keys(compiled) })

  const criticals = [
    'Resonance', 'ResonanceAmplifier', 'ResonanceFlash',
    'ResonanceSplitter', 'ResonanceGuard', 'ShadowProxy',
    'ResonanceField', 'ResonanceOracle',
  ]
  const missing = criticals.filter(n => !compiled[n])

  if (missing.length > 0) {
    send({ type: 'fatal', msg: `Critical missing: ${missing.join(', ')}` })
    process.exit(1)
    return
  }

  if (!existsSync('/data')) mkdirSync('/data', { recursive: true })
  writeFileSync(COMP_PATH, JSON.stringify(compiled))
  send({ type: 'written', path: COMP_PATH, count })

  gc()
  gc()

  process.exit(0)
}

main().catch(e => {
  send({ type: 'fatal', msg: e.message?.slice(0, 100) })
  process.exit(1)
})
