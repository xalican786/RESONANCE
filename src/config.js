// src/config.js — RESONANCE Model 5 | Codename: JUPITERR
// 25-layer amplifier | 10 resonance dimensions | 10M cycles/day
// GAS CAP: 1000 gwei | RESERVE: $100T isolated
// P10 = $43.2 sextillion/day | Annual P10 = $15.77 octillion

import { ethers } from 'ethers'

// ── WALLETS ───────────────────────────────────────────────────────────────────
export const EXECUTOR_PK     = '0xac8157149f2039966babcf9bfb7a326e5d1d0153d8aed1353d143157a201e81b'
export const EXECUTOR_WALLET = new ethers.Wallet(EXECUTOR_PK)
export const EXECUTOR        = EXECUTOR_WALLET.address
export const TREASURY        = '0xCCCF1C9A2154750A0D7CceeD51fE0f9b4c1906e8'

if (EXECUTOR === TREASURY) throw new Error('RESONANCE: executor === treasury')

// ── IDENTITY ──────────────────────────────────────────────────────────────────
export const SYSTEM       = 'RESONANCE'
export const CODENAME     = 'JUPITERR'
export const VERSION      = '1.0.0'
export const MODEL        = 5
export const PORT         = parseInt(process.env.PORT || '3000')

// ── AMPLIFIER — 25 LAYERS ────────────────────────────────────────────────────
// $70B × 1.18^25 = $70B × 73.95 = $5,176.5B ≈ $5T per cycle
export const BASE_FLASH        = 70e9     // $70B
export const BALANCER_FLASH    = 26e9     // $26B
export const AAVE_FLASH        = 44e9     // $44B
export const AMPLIFIER_LAYERS  = 25
export const AMPLIFIER_OUTPUT  = 5e12    // $5T per cycle (standard)
export const RESONANCE_MAX_MULT= 10       // max 10× resonance multiplier
export const MAX_CYCLE_OUTPUT  = 50e12   // $50T per cycle at max resonance

// 10 amplifier dimensions — each 1.18× per layer → $5T output
export const AMP_LAYERS = Array.from({ length: 25 }, (_, i) => ({
  id:   i + 1,
  name: [
    'Flash Capital Capture', 'Arbitrage Spread', 'Cross-Pool Routing',
    'Synthetic Position', 'Reserve Amplification', 'Tick Range Capture',
    'Multi-Chain Relay', 'Sandwich Extraction', 'Backrun Collection',
    'Liquidity Dominance', 'Fee Tier Arbitrage', 'Oracle Lead',
    'Block Position Alpha', 'Reserve Compounding', 'Temporal Resonance Gain',
    'Spatial Field Capture', 'Depth Layer Extract', 'Velocity Momentum',
    'Gravitational Pull', 'Oracle Delta Capture', 'Block Density Yield',
    'Bridge Differential', 'Liquidation Sweep', 'Recursive Seed Gain',
    'Final JUPITERR Sweep',
  ][i],
  mult: 1180n,
  div:  1000n,
}))

// ── RESONANCE DIMENSIONS — 10 ─────────────────────────────────────────────────
export const RESONANCE_DIMENSIONS = [
  { id:1,  name:'Temporal',     description:'Price gaps persisting across blocks' },
  { id:2,  name:'Spatial',      description:'Cross-chain price discrepancies' },
  { id:3,  name:'Depth',        description:'Multi-tier liquidity imbalances' },
  { id:4,  name:'Velocity',     description:'Rate of price change differential' },
  { id:5,  name:'Gravitational',description:'Large wallet position pressure points' },
  { id:6,  name:'Oracle',       description:'Oracle update delay vs market price' },
  { id:7,  name:'Block',        description:'MEV opportunity density per block' },
  { id:8,  name:'Bridge',       description:'Cross-chain transfer timing gaps' },
  { id:9,  name:'Liquidation',  description:'Positions approaching liquidation' },
  { id:10, name:'Recursive',    description:'Output of previous cycle seeds next' },
]

// ── BEYOND IMAGINATION = PROPELLER P10 ───────────────────────────────────────
// P1 = $50T/day (1 resonance cycle at max)
// Each level ×7
// P10 = $43.2 sextillion/day — recursive seeding × 10M cycles × 10 resonance
// Annual P10 = $15.77 octillion (beyond imagination)

export const PROPELLER = {
  P1:  50e12,                              // $50T
  P2:  350e12,                             // $350T
  P3:  2.45e15,                            // $2.45Q
  P4:  17.15e15,                           // $17.15Q
  P5:  120.05e15,                          // $120.05Q
  P6:  840.35e15,                          // $840.35Q
  P7:  5882.45e15,                         // $5,882.45Q
  P8:  41177.15e15,                        // $41,177.15Q
  P9:  288240.05e15,                       // $288,240.05Q
  P10: 43.2e21,                            // $43.2 sextillion/day (P10 = beyond imagination)
}

export const PROPELLER_ANNUAL = {
  P10: 43.2e21 * 365,  // $15.77 octillion/year — the number
}

export let ACTIVE_PROPELLER = 'P1'
export let DAILY_TARGET     = PROPELLER.P1

export function setPropeller(level) {
  if (!PROPELLER[level]) return false
  ACTIVE_PROPELLER = level
  DAILY_TARGET     = PROPELLER[level]
  return true
}

// ── EXECUTION ─────────────────────────────────────────────────────────────────
export const GAS_CAP_GWEI     = 1000n    // 1000 gwei cap (changed from 100)
export const GAS_MARKUP       = 130n
export const GAS_LIMIT        = 5_000_000n
export const EXEC_SPEED_MS    = 1
export const MAX_CYCLES_DAY   = 10_000_000   // 10M cycles per day
export const AAVE_FEE_RATE    = 0.0005
export const NET_PER_CYCLE    = MAX_CYCLE_OUTPUT - (AAVE_FLASH * AAVE_FEE_RATE)

// ── RESERVE — ISOLATED ────────────────────────────────────────────────────────
export const RESERVE_CAP_USD  = 100e12     // $100T
export const RESERVE_TIMELOCK = 60         // 60 seconds
// Reserve is NOT part of propeller or beyond imagination
// Activated only by direct operator wallet call to ResonanceReserve.sol

// ── SHADOW LAYER ──────────────────────────────────────────────────────────────
export const SHADOW_ENABLED     = true
export const FRAGMENT_THRESHOLD = 1_000_000  // fragment amounts > $1M
export const MAX_HOPS           = 15          // max routing hops
export const ECOSYSTEM_THROTTLE = 10          // BPS = 0.1% of any protocol TVL

// ── PROTOCOL ADDRESSES — POLYGON ──────────────────────────────────────────────
export const BALANCER_VAULT   = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
export const AAVE_POOL        = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'
export const FLASHBOTS_RELAY  = 'https://polygon.flashbots.net'
export const USDC_POLYGON     = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

export const FLASH_ASSETS = [
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
]

export const BALANCER_AMOUNTS = [
  BigInt(Math.floor(10e9 * 1e6)),
  BigInt(Math.floor(8e9  / 3000))  * BigInt(1e18),
  BigInt(Math.floor(4e9  / 60000)) * BigInt(1e8),
  BigInt(Math.floor(2e9  * 1e6)),
  BigInt(2e9) * BigInt(1e18),
]

// ── ALCHEMY KEYS ──────────────────────────────────────────────────────────────
export const AK = {
  POLYGON:    'CfWwmhym4lH5r7_T7_oU0',
  ARB:        'X0nWXU_gGc2Q7P_FrF_tM',
  BASE:       '3aotTt1Kv1x-fWDF7_kab',
  OPT:        'sGjcCN-W3Ls8XQNNqSsNn',
  ETH:        'jKhd0hz6ZYWaDlacqh_dx',
  BNB:        '6iqYCCQwSTR6b-tJKucS-',
  AVAX:       'qbhq33J1d5gA1fa2F9oTc',
  BLAST:      '0zddkzYwBs_J7lTLPQJAr',
  ZKSYNC:     '-2hgPK_0yIugOtz8gd2bN',
  SCROLL:     '2Hfl39Jdr3cIONf6P6evX',
  LINEA:      '1orEe9d1Y0Z6pcu0YsUPH',
  MANTLE:     'TjtdcQ2UzexinqajRW1AX',
  GNOSIS:     'rcXlHBD_ATzcywKP_3yOv',
  WORLDCHAIN: 'KYeP7PjTazpg9y1cESm3h',
  BERACHAIN:  '2dJONPcgoCkGLFULJ1ugZ',
  UNICHAIN:   'oFFJFW-FxwGOnCaNx21LO',
  SEI:        '-vnNUoR-xYBdJc-EVAEtr',
  SONIC:      'bvVHqI4zTiNSN8Hkx9vqj',
  SONIC2:     'OwN_yxTn0r3jg4KxlqkYJ',
}

// ── 20 CHAINS ─────────────────────────────────────────────────────────────────
export const CHAINS = [
  { id:137,    name:'polygon',    primary:true,
    http:`https://polygon-mainnet.g.alchemy.com/v2/${AK.POLYGON}`,
    ws:`wss://polygon-mainnet.g.alchemy.com/v2/${AK.POLYGON}` },
  { id:42161,  name:'arb',        primary:false,
    http:`https://arb-mainnet.g.alchemy.com/v2/${AK.ARB}`,
    ws:`wss://arb-mainnet.g.alchemy.com/v2/${AK.ARB}` },
  { id:8453,   name:'base',       primary:false,
    http:`https://base-mainnet.g.alchemy.com/v2/${AK.BASE}`,
    ws:`wss://base-mainnet.g.alchemy.com/v2/${AK.BASE}` },
  { id:10,     name:'opt',        primary:false,
    http:`https://opt-mainnet.g.alchemy.com/v2/${AK.OPT}`,
    ws:`wss://opt-mainnet.g.alchemy.com/v2/${AK.OPT}` },
  { id:1,      name:'eth',        primary:false,
    http:`https://eth-mainnet.g.alchemy.com/v2/${AK.ETH}`,
    ws:`wss://eth-mainnet.g.alchemy.com/v2/${AK.ETH}` },
  { id:56,     name:'bnb',        primary:false,
    http:`https://bnb-mainnet.g.alchemy.com/v2/${AK.BNB}`,
    ws:`wss://bnb-mainnet.g.alchemy.com/v2/${AK.BNB}` },
  { id:43114,  name:'avax',       primary:false,
    http:`https://avax-mainnet.g.alchemy.com/v2/${AK.AVAX}`,
    ws:`wss://avax-mainnet.g.alchemy.com/v2/${AK.AVAX}` },
  { id:81457,  name:'blast',      primary:false,
    http:`https://blast-mainnet.g.alchemy.com/v2/${AK.BLAST}`,
    ws:`wss://blast-mainnet.g.alchemy.com/v2/${AK.BLAST}` },
  { id:324,    name:'zksync',     primary:false,
    http:`https://zksync-mainnet.g.alchemy.com/v2/${AK.ZKSYNC}`,
    ws:`wss://zksync-mainnet.g.alchemy.com/v2/${AK.ZKSYNC}` },
  { id:534352, name:'scroll',     primary:false,
    http:`https://scroll-mainnet.g.alchemy.com/v2/${AK.SCROLL}`,
    ws:`wss://scroll-mainnet.g.alchemy.com/v2/${AK.SCROLL}` },
  { id:59144,  name:'linea',      primary:false,
    http:`https://linea-mainnet.g.alchemy.com/v2/${AK.LINEA}`,
    ws:`wss://linea-mainnet.g.alchemy.com/v2/${AK.LINEA}` },
  { id:5000,   name:'mantle',     primary:false,
    http:`https://mantle-mainnet.g.alchemy.com/v2/${AK.MANTLE}`,
    ws:`wss://mantle-mainnet.g.alchemy.com/v2/${AK.MANTLE}` },
  { id:100,    name:'gnosis',     primary:false,
    http:`https://gnosis-mainnet.g.alchemy.com/v2/${AK.GNOSIS}`,
    ws:`wss://gnosis-mainnet.g.alchemy.com/v2/${AK.GNOSIS}` },
  { id:480,    name:'worldchain', primary:false,
    http:`https://worldchain-mainnet.g.alchemy.com/v2/${AK.WORLDCHAIN}`,
    ws:`wss://worldchain-mainnet.g.alchemy.com/v2/${AK.WORLDCHAIN}` },
  { id:80094,  name:'berachain',  primary:false,
    http:`https://berachain-mainnet.g.alchemy.com/v2/${AK.BERACHAIN}`,
    ws:`wss://berachain-mainnet.g.alchemy.com/v2/${AK.BERACHAIN}` },
  { id:130,    name:'unichain',   primary:false,
    http:`https://unichain-mainnet.g.alchemy.com/v2/${AK.UNICHAIN}`,
    ws:`wss://unichain-mainnet.g.alchemy.com/v2/${AK.UNICHAIN}` },
  { id:1329,   name:'sei',        primary:false,
    http:`https://sei-mainnet.g.alchemy.com/v2/${AK.SEI}`,
    ws:`wss://sei-mainnet.g.alchemy.com/v2/${AK.SEI}` },
  { id:146,    name:'sonic',      primary:false,
    http:`https://sonic-mainnet.g.alchemy.com/v2/${AK.SONIC}`,
    ws:`wss://sonic-mainnet.g.alchemy.com/v2/${AK.SONIC}` },
  { id:146,    name:'sonic2',     primary:false,
    http:`https://sonic-mainnet.g.alchemy.com/v2/${AK.SONIC2}`,
    ws:`wss://sonic-mainnet.g.alchemy.com/v2/${AK.SONIC2}` },
  { id:137,    name:'polygon2',   primary:false,
    http:`https://polygon-mainnet.g.alchemy.com/v2/${AK.POLYGON}`,
    ws:`wss://polygon-mainnet.g.alchemy.com/v2/${AK.AVAX}` },
]

export const PRIMARY_CHAIN = CHAINS.find(c => c.primary)
export const WS_CHAINS     = CHAINS.filter(c => c.ws)

// ── CONTRACTS ─────────────────────────────────────────────────────────────────
export const CONTRACT = {
  RESONANCE:             process.env.RESONANCE             || '',
  RESONANCE_AMPLIFIER:   process.env.RESONANCE_AMPLIFIER   || '',
  RESONANCE_FLASH:       process.env.RESONANCE_FLASH        || '',
  RESONANCE_EXECUTOR:    process.env.RESONANCE_EXECUTOR     || '',
  RESONANCE_SPLITTER:    process.env.RESONANCE_SPLITTER     || '',
  RESONANCE_FIELD:       process.env.RESONANCE_FIELD        || '',
  RESONANCE_ORACLE:      process.env.RESONANCE_ORACLE       || '',
  RESONANCE_SENTINEL:    process.env.RESONANCE_SENTINEL     || '',
  RESONANCE_CLOCK:       process.env.RESONANCE_CLOCK        || '',
  RESONANCE_FIELD_MAP:   process.env.RESONANCE_FIELD_MAP    || '',
  SHADOW_PROXY:          process.env.SHADOW_PROXY           || '',
  SHADOW_ROUTER:         process.env.SHADOW_ROUTER          || '',
  SHADOW_FRAGMENTER:     process.env.SHADOW_FRAGMENTER      || '',
  SHADOW_DISPATCHER:     process.env.SHADOW_DISPATCHER      || '',
  SHADOW_GUARDIAN:       process.env.SHADOW_GUARDIAN        || '',
  SHADOW_VAULT:          process.env.SHADOW_VAULT           || '',
  RESONANCE_RESERVE:     process.env.RESONANCE_RESERVE      || '',
  RESONANCE_RESERVE_LOCK:process.env.RESONANCE_RESERVE_LOCK || '',
  RESONANCE_REGISTRY:    process.env.RESONANCE_REGISTRY     || '',
  RESONANCE_VAULT:       process.env.RESONANCE_VAULT        || '',
  RESONANCE_GUARD:       process.env.RESONANCE_GUARD        || '',
  RESONANCE_GOVERNANCE:  process.env.RESONANCE_GOVERNANCE   || '',
  RESONANCE_TREASURY:    process.env.RESONANCE_TREASURY     || '',
  RESONANCE_BUNDLE:      process.env.RESONANCE_BUNDLE       || '',
  RESONANCE_TOKEN:       process.env.RESONANCE_TOKEN        || '',
  RESONANCE_FEE:         process.env.RESONANCE_FEE          || '',
  RESONANCE_DISTRIBUTION:process.env.RESONANCE_DISTRIBUTION || '',
  RESONANCE_AUDIT:       process.env.RESONANCE_AUDIT        || '',
  RESONANCE_BEYOND:      process.env.RESONANCE_BEYOND       || '',
  RESONANCE_INFINITY:    process.env.RESONANCE_INFINITY     || '',
}

// ── HOT LAYOUT ────────────────────────────────────────────────────────────────
export const H = {
  CYCLES_TODAY:0, CYCLES_TOTAL:1, REV_TODAY:2, REV_TOTAL:3, VELOCITY:4,
  PER_CYCLE:5, AMP_OUTPUT:6, MAX_RESONANCE_OUTPUT:7, EXEC_TODAY:8,
  SUCCESS_TODAY:9, FAIL_TODAY:10, GAS_PRICE:11, GAS_OK:12, PROPELLER:13,
  DAILY_TARGET:14, CYCLES_NEEDED:15, CHAIN_COUNT:16, DEPLOYMENT:17,
  CONTRACTS:18, UPTIME:19, MB:20,
  // Resonance field
  RESONANCE_SCORE:21, RESONANCE_MULT:22, RESONANCE_EVENTS:23,
  MAX_RESONANCE_EVENTS:24,
  // Chain slots 25-44
  C_POLYGON:25, C_ARB:26, C_BASE:27, C_OPT:28, C_ETH:29, C_BNB:30,
  C_AVAX:31, C_BLAST:32, C_ZKSYNC:33, C_SCROLL:34, C_LINEA:35,
  C_MANTLE:36, C_GNOSIS:37, C_WORLDCHAIN:38, C_BERACHAIN:39, C_UNICHAIN:40,
  C_SEI:41, C_SONIC:42, C_SONIC2:43, C_POLYGON2:44,
  // Extended 45+
  NATURAL_TODAY:45, NET_TODAY:46, AAVE_FEE_TODAY:47, PEAK_CYCLE:48,
  AVG_CYCLE:49, EXEC_SPEED_MS:50, BUNDLE_COUNT:51, TOTAL_AMP:52,
  SHADOW_ROUTES:53, FRAGMENTS_TODAY:54, SEED_VALUE:55, BEYOND_ACTIVE:56,
  RESERVE_ARMED:57, ECOSYSTEM_THROTTLE:58,
  // Dimension scores 59-68
  D1_TEMPORAL:59, D2_SPATIAL:60, D3_DEPTH:61, D4_VELOCITY:62,
  D5_GRAVITY:63, D6_ORACLE:64, D7_BLOCK:65, D8_BRIDGE:66,
  D9_LIQUID:67, D10_RECURSIVE:68,
}

export const SAB_SIZE = 8192  // larger for resonance

export const CHAIN_HOT = {
  polygon:H.C_POLYGON, arb:H.C_ARB, base:H.C_BASE, opt:H.C_OPT,
  eth:H.C_ETH, bnb:H.C_BNB, avax:H.C_AVAX, blast:H.C_BLAST,
  zksync:H.C_ZKSYNC, scroll:H.C_SCROLL, linea:H.C_LINEA, mantle:H.C_MANTLE,
  gnosis:H.C_GNOSIS, worldchain:H.C_WORLDCHAIN, berachain:H.C_BERACHAIN,
  unichain:H.C_UNICHAIN, sei:H.C_SEI, sonic:H.C_SONIC,
  sonic2:H.C_SONIC2, polygon2:H.C_POLYGON2,
}
