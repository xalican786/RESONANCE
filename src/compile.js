// src/compile.js — RESONANCE one-shot compiler subprocess
// Runs as separate process — exits after writing artifacts to /data
// Peak memory: ~280MB during viaIR — exits completely before runtime starts
// 30 contracts sequential — GC between each — 500ms breathing room

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createRequire } from 'module'
import { ethers }        from 'ethers'

const require    = createRequire(import.meta.url)
const COMP_PATH  = '/data/resonance_compiled.json'
const ADDR_PATH  = '/data/resonance_contracts.json'

const SOURCES = [
  // Infrastructure first
  { name:'ResonanceGovernance',  path:'./contracts/ResonanceGovernance.sol',  critical:false },
  { name:'ResonanceRegistry',    path:'./contracts/ResonanceRegistry.sol',    critical:false },
  { name:'ResonanceVault',       path:'./contracts/ResonanceVault.sol',       critical:false },
  { name:'ResonanceAudit',       path:'./contracts/ResonanceAudit.sol',       critical:false },
  // Shadow layer
  { name:'ShadowVault',          path:'./contracts/ShadowVault.sol',          critical:false },
  { name:'ShadowFragmenter',     path:'./contracts/ShadowFragmenter.sol',     critical:false },
  { name:'ShadowDispatcher',     path:'./contracts/ShadowDispatcher.sol',     critical:false },
  { name:'ShadowGuardian',       path:'./contracts/ShadowGuardian.sol',       critical:false },
  { name:'ShadowRouter',         path:'./contracts/ShadowRouter.sol',         critical:true  },
  { name:'ShadowProxy',          path:'./contracts/ShadowProxy.sol',          critical:true  },
  // Reserve (isolated)
  { name:'ResonanceReserveLock', path:'./contracts/ResonanceReserveLock.sol', critical:false },
  { name:'ResonanceReserve',     path:'./contracts/ResonanceReserve.sol',     critical:false },
  // Core protocol
  { name:'ResonanceSplitter',    path:'./contracts/ResonanceSplitter.sol',    critical:true  },
  { name:'ResonanceBundle',      path:'./contracts/ResonanceBundle.sol',      critical:false },
  { name:'ResonanceTreasury',    path:'./contracts/ResonanceTreasury.sol',    critical:false },
  { name:'ResonanceGuard',       path:'./contracts/ResonanceGuard.sol',       critical:true  },
  { name:'ResonanceToken',       path:'./contracts/ResonanceToken.sol',       critical:false },
  { name:'ResonanceFee',         path:'./contracts/ResonanceFee.sol',         critical:false },
  { name:'ResonanceDistribution',path:'./contracts/ResonanceDistribution.sol',critical:false },
  // Field intelligence
  { name:'ResonanceClock',       path:'./contracts/ResonanceClock.sol',       critical:false },
  { name:'ResonanceFieldMap',    path:'./contracts/ResonanceFieldMap.sol',    critical:false },
  { name:'ResonanceField',       path:'./contracts/ResonanceField.sol',       critical:true  },
  { name:'ResonanceOracle',      path:'./contracts/ResonanceOracle.sol',      critical:true  },
  { name:'ResonanceSentinel',    path:'./contracts/ResonanceSentinel.sol',    critical:false },
  // Beyond imagination
  { name:'ResonanceInfinity',    path:'./contracts/ResonanceInfinity.sol',    critical:false },
  { name:'ResonanceBeyond',      path:'./contracts/ResonanceBeyond.sol',      critical:false },
  { name:'ResonanceExecutor',    path:'./contracts/ResonanceExecutor.sol',    critical:false },
  // Core execution — last (depends on everything above)
  { name:'ResonanceAmplifier',   path:'./contracts/ResonanceAmplifier.sol',   critical:true  },
  { name:'ResonanceFlash',       path:'./contracts/ResonanceFlash.sol',       critical:true  },
  { name:'Resonance',            path:'./contracts/Resonance.sol',            critical:true  },
]

function gc() {
  if (global.gc) { global.gc(); global.gc() }
}

function compileSingle(name, filePath) {
  if (!existsSync(filePath)) {
    process.send?.({ type:'missing', name })
    return null
  }

  gc()

  let solc, source
  try { solc   = require('solc')              } catch (e) { process.send?.({ type:'error', name, msg:`solc load: ${e.message?.slice(0,40)}` }); return null }
  try { source = readFileSync(filePath,'utf8')} catch (e) { process.send?.({ type:'error', name, msg:`read: ${e.message?.slice(0,40)}`       }); return null }

  const input = JSON.stringify({
    language: 'Solidity',
    sources:  { [`${name}.sol`]: { content: source } },
    settings: {
      viaIR:           true,
      optimizer:       { enabled:true, runs:200 },
      outputSelection: { '*': { '*': ['abi','evm.bytecode.object'] } },
    },
  })

  let out
  try { out = JSON.parse(solc.compile(input)) }
  catch (e) {
    process.send?.({ type:'error', name, msg:e.message?.slice(0,100) })
    gc()
    return null
  }

  const fatals = (out.errors||[]).filter(e => e.severity==='error')
  if (fatals.length) {
    fatals.forEach(f => process.send?.({ type:'error', name, msg:f.formattedMessage?.slice(0,160) }))
    out = null; gc(); return null
  }

  const c = out.contracts?.[`${name}.sol`]?.[name]
  if (!c?.evm?.bytecode?.object || c.evm.bytecode.object.length < 10) {
    process.send?.({ type:'error', name, msg:'empty bytecode' })
    out = null; gc(); return null
  }

  const result = { abi:c.abi, bytecode:'0x'+c.evm.bytecode.object }
  out = null; gc()
  return result
}

async function main() {
  // Check existing deployment — skip recompile if already deployed
  if (existsSync(ADDR_PATH)) {
    try {
      const d = JSON.parse(readFileSync(ADDR_PATH,'utf8'))
      if (d.Resonance && ethers.isAddress(d.Resonance)) {
        process.send?.({ type:'already_deployed', data:d })
        process.exit(0); return
      }
    } catch {}
  }

  process.send?.({ type:'start', count:SOURCES.length })

  const compiled = {}

  for (const { name, path:fp, critical } of SOURCES) {
    await new Promise(r => setTimeout(r, 500))
    const result = compileSingle(name, fp)
    if (result) {
      compiled[name] = result
      process.send?.({ type:'compiled', name })
    } else if (critical) {
      process.send?.({ type:'critical_fail', name })
    }
  }

  const count = Object.keys(compiled).length
  process.send?.({ type:'done', count, names:Object.keys(compiled) })

  // Verify critical contracts compiled
  const criticals = ['Resonance','ResonanceAmplifier','ResonanceFlash',
                     'ResonanceSplitter','ResonanceGuard','ShadowProxy']
  const missing   = criticals.filter(n => !compiled[n])

  if (missing.length > 0) {
    process.send?.({ type:'fatal', msg:`Critical missing: ${missing.join(', ')}` })
    process.exit(1); return
  }

  // Write artifacts
  if (!existsSync('/data')) mkdirSync('/data',{recursive:true})
  writeFileSync(COMP_PATH, JSON.stringify(compiled))
  process.send?.({ type:'written', path:COMP_PATH, count })

  gc()
  process.exit(0)
}

main().catch(e => {
  process.send?.({ type:'fatal', msg:e.message?.slice(0,100) })
  process.exit(1)
})
