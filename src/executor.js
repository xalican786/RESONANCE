// src/executor.js — RESONANCE executor (Worker)
// Reads resonance score from HOT — applies multiplier to amplifier
// 1ms ring poll | max 5 concurrent | nonce mutex
// Memory cap: 100MB (resourceLimits in index.js)

import { workerData, parentPort } from 'worker_threads'
import { ethers }                 from 'ethers'
import {
  EXECUTOR_PK, EXECUTOR,
  CONTRACT, H, PRIMARY_CHAIN,
  FLASH_ASSETS, BALANCER_AMOUNTS,
  GAS_CAP_GWEI, GAS_MARKUP, GAS_LIMIT,
  DAILY_TARGET,
  AAVE_FLASH, AAVE_FEE_RATE,
  MAX_CYCLES_DAY,
} from './config.js'
import { amplify }    from './amplifier.js'
import { recordCycle }from './cycles.js'

const SAB = workerData.SAB
const HOT = new Float64Array(SAB)

// Provider — single instance
let _provider = null
function getProvider() {
  if (!_provider) {
    const c = PRIMARY_CHAIN
    const n = new ethers.Network(c.name, c.id)
    _provider = new ethers.JsonRpcProvider(c.http, n, { staticNetwork:n })
  }
  return _provider
}

// Nonce mutex
let   nonceLocked  = false
const nonceQueue   = []
let   currentNonce = null

async function withNonce(fn) {
  return new Promise((resolve, reject) => {
    nonceQueue.push({ fn, resolve, reject })
    drainNonce()
  })
}

async function drainNonce() {
  if (nonceLocked || !nonceQueue.length) return
  nonceLocked = true
  const { fn, resolve, reject } = nonceQueue.shift()
  try {
    if (currentNonce === null) {
      currentNonce = await getProvider().getTransactionCount(EXECUTOR,'pending')
    }
    resolve(await fn(currentNonce))
    currentNonce++
  } catch (e) {
    currentNonce = null; reject(e)
  } finally {
    nonceLocked = false
    if (nonceQueue.length) drainNonce()
  }
}

// Gas check — 10s cache
let lastGasTs = 0, lastGasOK = true

async function checkGas() {
  const now = Date.now()
  if (now - lastGasTs < 10_000) return lastGasOK
  try {
    const fee  = await getProvider().getFeeData()
    const gwei = Number(fee.gasPrice||0n) / 1e9
    HOT[H.GAS_PRICE] = gwei
    lastGasOK        = gwei <= 1000  // 1000 gwei cap
    HOT[H.GAS_OK]    = lastGasOK ? 1 : 0
    lastGasTs        = now
  } catch {}
  return lastGasOK
}

let activeExecs  = 0
const MAX_CONC   = 5
let   cycleId    = 0

const RESONANCE_ABI = [
  'function execute(address[],uint256[],address,uint256,bytes32,uint256) external',
]

async function executeCycle() {
  if (!CONTRACT.RESONANCE) return
  if (HOT[H.GAS_OK]      === 0) return
  if ((HOT[H.CYCLES_TODAY]||0) >= MAX_CYCLES_DAY) return
  if ((HOT[H.REV_TODAY]  ||0) >= DAILY_TARGET) return
  if (activeExecs >= MAX_CONC) return

  activeExecs++
  cycleId++
  HOT[H.EXEC_TODAY] = (HOT[H.EXEC_TODAY]||0) + 1

  const t0 = Date.now()

  // Get live resonance multiplier from HOT
  const resonanceMult = Math.max(1, Math.min(10, HOT[H.RESONANCE_MULT]||1))
  const amp = amplify(undefined, resonanceMult)
  HOT[H.AMP_OUTPUT] = amp.output

  const cycleHash = ethers.keccak256(
    ethers.solidityPacked(['uint256','uint256','uint8'],
      [BigInt(cycleId), BigInt(t0), resonanceMult])
  )

  try {
    const provider   = getProvider()
    const signer     = new ethers.Wallet(EXECUTOR_PK, provider)
    const resonance  = new ethers.Contract(CONTRACT.RESONANCE, RESONANCE_ABI, signer)
    const aaveAmount = BigInt(Math.floor(AAVE_FLASH * 1e6))

    const receipt = await withNonce(async nonce => {
      const feeData  = await provider.getFeeData()
      const rawGas   = feeData.gasPrice || ethers.parseUnits('50','gwei')
      const capGas   = GAS_CAP_GWEI * BigInt(1e9)
      const gasPrice = rawGas > capGas
        ? (capGas * GAS_MARKUP) / 100n
        : (rawGas * GAS_MARKUP) / 100n

      const tx = await resonance.execute(
        FLASH_ASSETS, BALANCER_AMOUNTS,
        FLASH_ASSETS[0], aaveAmount,
        cycleHash, BigInt(cycleId),
        { gasLimit:GAS_LIMIT, gasPrice, nonce }
      )
      return tx.wait(1)
    })

    const elapsed = Date.now() - t0
    HOT[H.EXEC_SPEED_MS] = elapsed

    if (receipt?.status) {
      const aaveFee = AAVE_FLASH * AAVE_FEE_RATE
      const netRev  = amp.output - aaveFee

      HOT[H.SUCCESS_TODAY]  = (HOT[H.SUCCESS_TODAY]  ||0) + 1
      HOT[H.REV_TODAY]      = (HOT[H.REV_TODAY]      ||0) + amp.output
      HOT[H.REV_TOTAL]      = (HOT[H.REV_TOTAL]      ||0) + amp.output
      HOT[H.NET_TODAY]      = (HOT[H.NET_TODAY]       ||0) + netRev
      HOT[H.AAVE_FEE_TODAY] = (HOT[H.AAVE_FEE_TODAY] ||0) + aaveFee
      HOT[H.PER_CYCLE]      = amp.output
      HOT[H.TOTAL_AMP]      = (HOT[H.TOTAL_AMP]       ||0) + 1

      if (amp.output > (HOT[H.PEAK_CYCLE]||0)) HOT[H.PEAK_CYCLE] = amp.output
      const c = HOT[H.CYCLES_TODAY]||1
      HOT[H.AVG_CYCLE] = HOT[H.REV_TODAY] / c

      recordCycle(amp.output, HOT)

      parentPort?.postMessage({
        type:'cycle', extracted:amp.output,
        netRev, txHash:receipt.hash, elapsed_ms:elapsed,
        resonanceMult, cycleId,
      })

      if ((HOT[H.CYCLES_TODAY]|0) % 10_000 === 0) {
        const revT = (HOT[H.REV_TODAY]||0)/1e12
        console.log(`[EXECUTOR] ${HOT[H.CYCLES_TODAY]|0} cycles | $${revT.toFixed(2)}T today | ${elapsed}ms | x${resonanceMult} resonance`)
      }
    } else {
      HOT[H.FAIL_TODAY] = (HOT[H.FAIL_TODAY]||0) + 1
    }
  } catch (e) {
    HOT[H.FAIL_TODAY] = (HOT[H.FAIL_TODAY]||0) + 1
    if (process.env.DEBUG) console.log(`[EXECUTOR] ${e.message?.slice(0,60)}`)
  } finally {
    activeExecs--
  }
}

// 1ms ring reader
let rHead = 0

function startReader() {
  rHead = 0

  setInterval(() => checkGas().catch(() => {}), 10_000)
  checkGas().catch(() => {})

  setInterval(() => {
    const natural = HOT[H.NATURAL_TODAY] || 0
    let processed = 0
    while (rHead < natural && processed < 5 && activeExecs < MAX_CONC) {
      executeCycle().catch(() => {})
      rHead++
      processed++
    }
  }, 1)

  setInterval(() => {
    const rev    = HOT[H.REV_TODAY] || 0
    const uptime = HOT[H.UPTIME]   || 1
    HOT[H.VELOCITY] = rev / uptime
  }, 1_000)

  console.log('[EXECUTOR] 1ms ring reader | resonance-aware | 5 concurrent max | 1000 gwei cap')
}

startReader()
