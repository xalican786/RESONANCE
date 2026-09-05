// src/oracle.js — Multi-chain Chainlink oracle reader
// Feeds resonance field with live price data
// Updates every 30 seconds

import { ethers } from 'ethers'
import { PRIMARY_CHAIN, H } from './config.js'

const FEEDS = {
  ETH_USD:   '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  BTC_USD:   '0xc907E116054Ad103354f2D350FD2514433D57F6f',
  MATIC_USD: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
}

const ABI = ['function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)']

function makeProvider() {
  const c = PRIMARY_CHAIN
  const n = new ethers.Network(c.name, c.id)
  return new ethers.JsonRpcProvider(c.http, n, { staticNetwork: n })
}

let ethPrice = 0, btcPrice = 0, maticPrice = 0

async function readPrices() {
  try {
    const provider = makeProvider()
    const eth   = new ethers.Contract(FEEDS.ETH_USD,   ABI, provider)
    const btc   = new ethers.Contract(FEEDS.BTC_USD,   ABI, provider)
    const matic = new ethers.Contract(FEEDS.MATIC_USD, ABI, provider)

    const [ethD, btcD, maticD] = await Promise.allSettled([
      eth.latestRoundData(), btc.latestRoundData(), matic.latestRoundData(),
    ])

    if (ethD.status   === 'fulfilled') ethPrice   = Number(ethD.value[1])   / 1e8
    if (btcD.status   === 'fulfilled') btcPrice   = Number(btcD.value[1])   / 1e8
    if (maticD.status === 'fulfilled') maticPrice = Number(maticD.value[1]) / 1e8
  } catch {}
}

export function getPrices() { return { ethPrice, btcPrice, maticPrice } }

export function startOracle(HOT) {
  readPrices().catch(() => {})
  setInterval(() => readPrices().catch(() => {}), 30_000)
  console.log('[ORACLE] Chainlink feeds active | ETH/BTC/MATIC | 30s refresh')
}
