import { POWDER_TIERS } from '../data/powder-constants'

/** Remap a cutting-edge powder id to a versioned id (numTiers tiers). Port of powders.js encodePowderIdx. */
export function encodePowderIdx(powderIdx: number, numTiers: number): number {
  return Math.floor(powderIdx / POWDER_TIERS) * numTiers + (powderIdx % POWDER_TIERS)
}

/** Inverse of encodePowderIdx. Port of powders.js decodePowderIdx. */
export function decodePowderIdx(powderIdx: number, numTiers: number): number {
  return powderIdx + Math.floor(powderIdx / numTiers) * (POWDER_TIERS - numTiers)
}

/**
 * Group identical powder elements together, preserving first-seen element order.
 * Port of build_encode_decode.js collectPowders.
 */
export function collectPowders(powders: number[], elementsCount: number, tiers: number): number[][] {
  const powderChunks: number[][] = Array.from({ length: elementsCount }, () => [])
  const order: number[] = Array.from({ length: elementsCount }).fill(-1)
  let currOrder = 0
  for (const powder of powders) {
    const elementIdx = Math.floor(powder / tiers)
    if (order[elementIdx]! < 0) {
      powderChunks[currOrder]!.push(powder)
      order[elementIdx] = currOrder
      currOrder += 1
    }
    else {
      powderChunks[order[elementIdx]!]!.push(powder)
    }
  }
  return powderChunks
}
