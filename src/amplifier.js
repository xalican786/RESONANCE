// src/amplifier.js — RESONANCE 25-layer amplifier
// $70B × 1.18^25 = $5,176B ≈ $5T per cycle
// + resonance multiplier 1-10 = $5T to $50T per cycle
// Pre-computed lookup — < 0.01ms per call

import { AMP_LAYERS, BASE_FLASH, AMPLIFIER_OUTPUT, RESONANCE_MAX_MULT } from './config.js'

// Build lookup table once at module load
const BASE_UNITS = BigInt(Math.floor(BASE_FLASH * 1e6))

let _output = BASE_UNITS
const _layerOutputs = []

for (const layer of AMP_LAYERS) {
  _output = (_output * layer.mult) / layer.div
  _layerOutputs.push(_output)
}

const CACHED_OUTPUT     = _output
const CACHED_OUTPUT_USD = Number(CACHED_OUTPUT) / 1e6

console.log(
  `[AMPLIFIER] Lookup: $${Math.floor(BASE_FLASH/1e9)}B × 1.18^25 = ` +
  `$${(CACHED_OUTPUT_USD/1e12).toFixed(2)}T | ` +
  `Max (×10 resonance): $${(CACHED_OUTPUT_USD*10/1e12).toFixed(2)}T`
)

export function amplify(baseAmountUSD = BASE_FLASH, resonanceMult = 1) {
  const t0   = performance.now()
  const mult = Math.min(resonanceMult, RESONANCE_MAX_MULT)

  let outputUSD
  if (baseAmountUSD === BASE_FLASH) {
    outputUSD = CACHED_OUTPUT_USD * mult
  } else {
    let v = BigInt(Math.floor(baseAmountUSD * 1e6))
    for (const layer of AMP_LAYERS) {
      v = (v * layer.mult) / layer.div
    }
    outputUSD = Number(v) / 1e6 * mult
  }

  return {
    input:         baseAmountUSD,
    output:        outputUSD,
    resonanceMult: mult,
    elapsed_ms:    performance.now() - t0,
    isMaxResonance: mult === RESONANCE_MAX_MULT,
  }
}

export function layerBreakdown() {
  const maxOut = Number(_layerOutputs[24]) / 1e6
  return AMP_LAYERS.map((layer, i) => {
    const outUSD = Number(_layerOutputs[i]) / 1e6
    return {
      id:            layer.id,
      name:          layer.name,
      mult:          `${Number(layer.mult) / Number(layer.div)}×`,
      output:        outUSD,
      outputDisplay: outUSD >= 1e12
        ? `$${(outUSD/1e12).toFixed(2)}T`
        : outUSD >= 1e9 ? `$${(outUSD/1e9).toFixed(2)}B`
        : `$${outUSD.toFixed(2)}`,
      pctOfMax:      Math.round(outUSD / maxOut * 100),
    }
  })
}

export function updateLayer(id, mult, div) {
  const layer = AMP_LAYERS.find(l => l.id === id)
  if (!layer || mult <= div) return false
  layer.mult = BigInt(mult)
  layer.div  = BigInt(div)
  // Rebuild
  let v = BASE_UNITS
  for (let i = 0; i < AMP_LAYERS.length; i++) {
    v = (v * AMP_LAYERS[i].mult) / AMP_LAYERS[i].div
    _layerOutputs[i] = v
  }
  return true
}

export const BASE_OUTPUT_USD = CACHED_OUTPUT_USD
export const MAX_OUTPUT_USD  = CACHED_OUTPUT_USD * RESONANCE_MAX_MULT
