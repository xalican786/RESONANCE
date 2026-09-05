// src/deployer.js — RESONANCE deployer
// Forks compile.js — compilation runs in isolated 280MB subprocess
// Runtime starts AFTER compiler exits — no memory overlap
// 30 contracts deployed in dependency order
// Persists to /data/resonance_contracts.json

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { fork }          from 'child_process'
import { ethers }        from 'ethers'
import { fileURLToPath } from 'url'
import path              from 'path'
import {
  EXECUTOR_PK, EXECUTOR, TREASURY,
  CONTRACT, H, PRIMARY_CHAIN,
  BALANCER_VAULT, AAVE_POOL,
  FLASH_ASSETS, BALANCER_AMOUNTS,
} from './config.js'

const __dir    = path.dirname(fileURLToPath(import.meta.url))
const ADDR_PATH= '/data/resonance_contracts.json'
const COMP_PATH= '/data/resonance_compiled.json'

function makeProvider() {
  const c = PRIMARY_CHAIN
  const n = new ethers.Network(c.name, c.id)
  return new ethers.JsonRpcProvider(c.http, n, { staticNetwork:n })
}
function makeSigner() { return new ethers.Wallet(EXECUTOR_PK, makeProvider()) }

function loadAddresses() {
  try {
    if (!existsSync(ADDR_PATH)) return null
    const d = JSON.parse(readFileSync(ADDR_PATH,'utf8'))
    return d.Resonance && ethers.isAddress(d.Resonance) ? d : null
  } catch { return null }
}

function loadCompiled() {
  try {
    if (!existsSync(COMP_PATH)) return null
    return JSON.parse(readFileSync(COMP_PATH,'utf8'))
  } catch { return null }
}

function saveAddresses(data) {
  try {
    if (!existsSync('/data')) mkdirSync('/data',{recursive:true})
    writeFileSync(ADDR_PATH, JSON.stringify(data,null,2))
  } catch {}
}

function inject(addrs) {
  const map = {
    RESONANCE:             'Resonance',
    RESONANCE_AMPLIFIER:   'ResonanceAmplifier',
    RESONANCE_FLASH:       'ResonanceFlash',
    RESONANCE_EXECUTOR:    'ResonanceExecutor',
    RESONANCE_SPLITTER:    'ResonanceSplitter',
    RESONANCE_FIELD:       'ResonanceField',
    RESONANCE_ORACLE:      'ResonanceOracle',
    RESONANCE_SENTINEL:    'ResonanceSentinel',
    RESONANCE_CLOCK:       'ResonanceClock',
    RESONANCE_FIELD_MAP:   'ResonanceFieldMap',
    SHADOW_PROXY:          'ShadowProxy',
    SHADOW_ROUTER:         'ShadowRouter',
    SHADOW_FRAGMENTER:     'ShadowFragmenter',
    SHADOW_DISPATCHER:     'ShadowDispatcher',
    SHADOW_GUARDIAN:       'ShadowGuardian',
    SHADOW_VAULT:          'ShadowVault',
    RESONANCE_RESERVE:     'ResonanceReserve',
    RESONANCE_RESERVE_LOCK:'ResonanceReserveLock',
    RESONANCE_REGISTRY:    'ResonanceRegistry',
    RESONANCE_VAULT:       'ResonanceVault',
    RESONANCE_GUARD:       'ResonanceGuard',
    RESONANCE_GOVERNANCE:  'ResonanceGovernance',
    RESONANCE_TREASURY:    'ResonanceTreasury',
    RESONANCE_BUNDLE:      'ResonanceBundle',
    RESONANCE_TOKEN:       'ResonanceToken',
    RESONANCE_FEE:         'ResonanceFee',
    RESONANCE_DISTRIBUTION:'ResonanceDistribution',
    RESONANCE_AUDIT:       'ResonanceAudit',
    RESONANCE_BEYOND:      'ResonanceBeyond',
    RESONANCE_INFINITY:    'ResonanceInfinity',
  }
  for (const [env,key] of Object.entries(map)) {
    const val = addrs[key]
    if (val && ethers.isAddress(val)) {
      process.env[env] = val
      CONTRACT[env]    = val
    }
  }
}

// ── FORK COMPILER ─────────────────────────────────────────────────────────────
function runCompiler() {
  return new Promise((resolve, reject) => {
    console.log('[DEPLOYER] Forking compiler subprocess (280MB isolated)...')

    const child = fork(
      path.join(__dir,'compile.js'),
      [],
      {
        execArgv:['--max-old-space-size=280','--expose-gc','--gc-interval=50'],
        silent:false,
      }
    )

    child.on('message', msg => {
      switch(msg.type) {
        case 'start':          console.log(`[DEPLOYER] Compiling ${msg.count} contracts (viaIR, subprocess)...`); break
        case 'compiled':       console.log(`[DEPLOYER] + ${msg.name}`); break
        case 'missing':        console.log(`[DEPLOYER] Missing: ${msg.name}.sol`); break
        case 'error':          console.log(`[DEPLOYER] ${msg.name}: ${msg.msg}`); break
        case 'critical_fail':  console.log(`[DEPLOYER] CRITICAL FAIL: ${msg.name}`); break
        case 'done':           console.log(`[DEPLOYER] Compiled ${msg.count}/30: ${msg.names.join(', ')}`); break
        case 'written':        console.log(`[DEPLOYER] Artifacts written (${msg.count} contracts)`); break
        case 'already_deployed':
          console.log('[DEPLOYER] Existing deployment found — skipping compile')
          resolve({ alreadyDeployed:true, data:msg.data }); break
        case 'fatal':          console.log(`[DEPLOYER] FATAL: ${msg.msg}`); break
      }
    })

    child.on('exit', code => {
      if (code === 0) {
        const compiled = loadCompiled()
        compiled ? resolve({ compiled }) : reject(new Error('No artifacts after compile'))
      } else {
        reject(new Error(`Compiler exited: ${code}`))
      }
    })

    child.on('error', e => reject(e))
  })
}

// ── DEPLOY ONE ─────────────────────────────────────────────────────────────────
async function deployOne(compiled, name, args = []) {
  const c = compiled[name]
  if (!c) { console.log(`[DEPLOYER] ${name} not compiled — skip`); return null }

  const provider = makeProvider()
  const signer   = makeSigner()
  const feeData  = await provider.getFeeData()
  const rawGas   = feeData.gasPrice || ethers.parseUnits('50','gwei')
  const capGas   = ethers.parseUnits('1000','gwei')  // 1000 gwei cap
  const gasPrice = rawGas > capGas ? (capGas*130n)/100n : (rawGas*130n)/100n

  const factory  = new ethers.ContractFactory(c.abi, c.bytecode, signer)
  const contract = await factory.deploy(...args,{ gasLimit:5_000_000, gasPrice })
  const receipt  = await contract.deploymentTransaction().wait(2)
  const address  = await contract.getAddress()

  if (!receipt?.status) throw new Error(`${name} reverted`)

  // Free bytecode from memory after deploy
  if (compiled[name]) compiled[name].bytecode = ''

  console.log(`[DEPLOYER] ${name} → ${address.slice(0,14)}...`)
  return address
}

// ── DEPLOY ALL 30 ─────────────────────────────────────────────────────────────
async function deployAll(compiled, HOT) {
  const addrs = {}

  const deploy = async (name, args) => {
    for (let i=1; i<=3; i++) {
      try {
        const a = await deployOne(compiled, name, args)
        if (a) { addrs[name]=a; return a }
      } catch (e) {
        console.log(`[DEPLOYER] ${name} attempt ${i}/3: ${e.message?.slice(0,60)}`)
        if (i<3) await new Promise(r => setTimeout(r,8_000))
      }
    }
    return null
  }

  // Infrastructure
  await deploy('ResonanceGovernance',   [EXECUTOR])
  await deploy('ResonanceRegistry',     [EXECUTOR])
  await deploy('ResonanceVault',        [EXECUTOR, TREASURY])
  await deploy('ResonanceAudit',        [EXECUTOR])

  // Shadow layer — order matters
  const svaultAddr  = await deploy('ShadowVault',      [EXECUTOR, TREASURY])
  await deploy('ShadowFragmenter',  [EXECUTOR])
  const sdispAddr   = await deploy('ShadowDispatcher', [EXECUTOR, svaultAddr||EXECUTOR])
  await deploy('ShadowGuardian',    [EXECUTOR])
  const srouterAddr = await deploy('ShadowRouter',     [EXECUTOR, TREASURY, sdispAddr||EXECUTOR])
  const sproxyAddr  = await deploy('ShadowProxy',      [EXECUTOR, TREASURY, srouterAddr||EXECUTOR])

  // Reserve (isolated)
  const reserveLockAddr = await deploy('ResonanceReserveLock', [EXECUTOR, EXECUTOR, EXECUTOR])
  await deploy('ResonanceReserve', [EXECUTOR, EXECUTOR])

  // Core protocol
  const splitterAddr = await deploy('ResonanceSplitter', [EXECUTOR, TREASURY, sproxyAddr||EXECUTOR])
  await deploy('ResonanceBundle',       [EXECUTOR])
  await deploy('ResonanceTreasury',     [EXECUTOR])
  const guardAddr    = await deploy('ResonanceGuard',    [EXECUTOR, EXECUTOR])
  await deploy('ResonanceToken',        [EXECUTOR])
  await deploy('ResonanceFee',          [EXECUTOR, TREASURY])
  await deploy('ResonanceDistribution', [EXECUTOR])

  // Field intelligence
  await deploy('ResonanceClock',   [EXECUTOR])
  await deploy('ResonanceFieldMap',[EXECUTOR])
  const sentinelAddr = await deploy('ResonanceSentinel', [EXECUTOR, EXECUTOR])
  const oracleAddr   = await deploy('ResonanceOracle',   [EXECUTOR, EXECUTOR])
  const fieldAddr    = await deploy('ResonanceField',    [EXECUTOR, oracleAddr||EXECUTOR, sentinelAddr||EXECUTOR])

  // Beyond imagination
  await deploy('ResonanceInfinity', [EXECUTOR])
  await deploy('ResonanceBeyond',   [EXECUTOR, EXECUTOR])
  await deploy('ResonanceExecutor', [EXECUTOR])

  // Core execution — needs all above
  const ampAddr = await deploy('ResonanceAmplifier', [
    EXECUTOR, EXECUTOR, reserveLockAddr||EXECUTOR,
  ])
  await deploy('ResonanceFlash', [
    EXECUTOR, EXECUTOR, BALANCER_VAULT, AAVE_POOL, TREASURY,
  ])

  const resonanceAddr = await deploy('Resonance', [
    EXECUTOR, TREASURY, BALANCER_VAULT, AAVE_POOL,
    ampAddr     || EXECUTOR,
    fieldAddr   || EXECUTOR,
    guardAddr   || EXECUTOR,
    sproxyAddr  || EXECUTOR,
    splitterAddr|| EXECUTOR,
  ])

  if (!resonanceAddr) { console.log('[DEPLOYER] FATAL: Resonance deploy failed'); return false }

  // Post-deploy setup
  if (addrs.ResonanceVault) {
    try {
      const signer = makeSigner()
      const vault  = new ethers.Contract(
        addrs.ResonanceVault,
        ['function addAsset(address,string,uint8,uint256,uint256) external'],
        signer
      )
      const assets = [
        [FLASH_ASSETS[0],'USDC',6, BigInt(10e9*1e6), BigInt(15e9*1e6)],
        [FLASH_ASSETS[1],'WETH',18,BigInt(Math.floor(8e9/3000))*BigInt(1e18),BigInt(Math.floor(14e9/3000))*BigInt(1e18)],
        [FLASH_ASSETS[3],'USDT',6, BigInt(2e9*1e6),  BigInt(4e9*1e6)],
        [FLASH_ASSETS[4],'DAI', 18,BigInt(2e9)*BigInt(1e18),BigInt(3e9)*BigInt(1e18)],
      ]
      for (const a of assets) {
        try { await (await vault.addAsset(...a,{gasLimit:200_000})).wait(1) } catch {}
      }
      console.log('[DEPLOYER] ResonanceVault assets registered')
    } catch {}
  }

  if (splitterAddr && resonanceAddr) {
    try {
      const signer = makeSigner()
      const s = new ethers.Contract(
        splitterAddr,
        ['function authorize(address,bool) external'],
        signer
      )
      await (await s.authorize(resonanceAddr,true,{gasLimit:100_000})).wait(1)
      console.log('[DEPLOYER] Splitter authorized')
    } catch {}
  }

  inject(addrs)
  saveAddresses({ ...addrs, deployedAt:Date.now(), chain:PRIMARY_CHAIN.name })

  const count = Object.values(addrs).filter(v => typeof v==='string' && ethers.isAddress(v)).length
  HOT[H.CONTRACTS]  = count
  HOT[H.DEPLOYMENT] = 1

  // Purge compiled artifacts — free disk
  try { if (existsSync(COMP_PATH)) unlinkSync(COMP_PATH) } catch {}

  console.log(`[DEPLOYER] ${count}/30 deployed | Resonance: ${resonanceAddr.slice(0,14)}...`)
  console.log('[DEPLOYER] Compiled artifacts purged — runtime memory clean')
  return true
}

// ── WATCH FOR POL ─────────────────────────────────────────────────────────────
function watchForFunds(compiled, SAB, HOT) {
  const provider = makeProvider()
  let deploying = false, lastBal = -1

  const iv = setInterval(async () => {
    if (deploying) return
    try {
      const bal = await provider.getBalance(EXECUTOR)
      const pol = parseFloat(ethers.formatEther(bal))
      if (Math.floor(pol*100) !== lastBal) {
        lastBal = Math.floor(pol*100)
        if (pol > 0) console.log(`[DEPLOYER] ${pol.toFixed(4)} POL | need 0.1 at ${EXECUTOR}`)
      }
      if (pol >= 0.1) {
        deploying = true
        clearInterval(iv)
        const ok = await deployAll(compiled, HOT)
        if (!ok) {
          deploying = false
          setTimeout(() => watchForFunds(compiled, SAB, HOT), 60_000)
        }
      }
    } catch {}
  }, 500)
}

// ── ENTRY ─────────────────────────────────────────────────────────────────────
export function startDeployer(SAB) {
  const HOT = new Float64Array(SAB)

  const existing = loadAddresses()
  if (existing) {
    inject(existing)
    const count = Object.values(existing).filter(v => typeof v==='string' && ethers.isAddress(v)).length
    HOT[H.CONTRACTS]  = count
    HOT[H.DEPLOYMENT] = 1
    console.log(`[DEPLOYER] Restored ${count} contracts | Resonance: ${existing.Resonance.slice(0,14)}...`)
    return
  }

  setTimeout(async () => {
    let attempts = 0
    const tryCompile = async () => {
      attempts++
      try {
        const result = await runCompiler()
        if (result.alreadyDeployed) {
          inject(result.data)
          const count = Object.values(result.data).filter(v => typeof v==='string' && ethers.isAddress(v)).length
          HOT[H.CONTRACTS]=count; HOT[H.DEPLOYMENT]=1
          return
        }
        if (result.compiled) watchForFunds(result.compiled, SAB, HOT)
      } catch (e) {
        console.log(`[DEPLOYER] Compile attempt ${attempts}/5: ${e.message?.slice(0,60)}`)
        if (attempts < 5) setTimeout(tryCompile, 30_000)
        else console.log('[DEPLOYER] Compilation failed after 5 attempts')
      }
    }
    tryCompile()
  }, 3_000)
}
