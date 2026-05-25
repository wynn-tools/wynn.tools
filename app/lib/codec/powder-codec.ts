import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { POWDER_TIERS } from '../data/powder-constants'
import { bitlen, flags, mod, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'

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

export function encodePowders(powderset: number[], enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (powderset.length === 0) {
    vec.appendFlag('EQUIPMENT_POWDERS_FLAG', 'NO_POWDERS')
    return vec
  }
  const tiers = num(enc, 'POWDER_TIERS')
  const elementsCount = num(enc, 'POWDER_ELEMENTS_COUNT')
  const collected = collectPowders(powderset, elementsCount, tiers)
  vec.appendFlag('EQUIPMENT_POWDERS_FLAG', 'HAS_POWDERS')

  let previousPowder = -1
  for (const powderChunk of collected) {
    let i = 0
    while (i < powderChunk.length) {
      const powder = powderChunk[i]!
      if (previousPowder >= 0) {
        vec.appendFlag('POWDER_REPEAT_OP', 'NO_REPEAT')
        if (powder % POWDER_TIERS === previousPowder % POWDER_TIERS) {
          vec.appendFlag('POWDER_REPEAT_TIER_OP', 'REPEAT_TIER')
          const elementWrapper = mod((powder - previousPowder) / POWDER_TIERS, elementsCount) - 1
          vec.append(elementWrapper, num(enc, 'POWDER_WRAPPER_BITLEN'))
        }
        else {
          vec.appendFlag('POWDER_REPEAT_TIER_OP', 'CHANGE_POWDER')
          vec.appendFlag('POWDER_CHANGE_OP', 'NEW_POWDER')
          vec.append(encodePowderIdx(powder, tiers), num(enc, 'POWDER_ID_BITLEN'))
        }
      }
      else {
        vec.append(encodePowderIdx(powder, tiers), num(enc, 'POWDER_ID_BITLEN'))
      }
      while (++i < powderChunk.length && powderChunk[i] === powder)
        vec.appendFlag('POWDER_REPEAT_OP', 'REPEAT')
      previousPowder = powder
    }
  }
  vec.appendFlag('POWDER_REPEAT_OP', 'NO_REPEAT')
  vec.appendFlag('POWDER_REPEAT_TIER_OP', 'CHANGE_POWDER')
  vec.appendFlag('POWDER_CHANGE_OP', 'NEW_ITEM')
  return vec
}

export function decodePowders(cursor: BitVectorCursor, dec: EncodingConstants): number[] {
  const tiers = num(dec, 'POWDER_TIERS')
  const elementsCount = num(dec, 'POWDER_ELEMENTS_COUNT')
  const REPEAT_OP = flags(dec, 'POWDER_REPEAT_OP')
  const TIER_OP = flags(dec, 'POWDER_REPEAT_TIER_OP')
  const CHANGE_OP = flags(dec, 'POWDER_CHANGE_OP')

  const powders: number[] = [decodePowderIdx(cursor.advanceBy(num(dec, 'POWDER_ID_BITLEN')), tiers)]
  let prevPowder = powders[0]!
  while (true) {
    const repeatOp = cursor.advanceBy(bitlen(dec, 'POWDER_REPEAT_OP'))
    if (repeatOp === REPEAT_OP.REPEAT) {
      powders.push(prevPowder)
    }
    else {
      const tierOp = cursor.advanceBy(bitlen(dec, 'POWDER_REPEAT_TIER_OP'))
      if (tierOp === TIER_OP.REPEAT_TIER) {
        const powderWrap = cursor.advanceBy(num(dec, 'POWDER_WRAPPER_BITLEN'))
        const prevElem = Math.floor(prevPowder / POWDER_TIERS)
        const prevTier = prevPowder % POWDER_TIERS
        const newElem = (prevElem + powderWrap + 1) % elementsCount
        powders.push(newElem * POWDER_TIERS + prevTier)
      }
      else {
        const changeOp = cursor.advanceBy(bitlen(dec, 'POWDER_CHANGE_OP'))
        if (changeOp === CHANGE_OP.NEW_POWDER) {
          powders.push(decodePowderIdx(cursor.advanceBy(num(dec, 'POWDER_ID_BITLEN')), tiers))
        }
        else {
          break // NEW_ITEM
        }
      }
    }
    prevPowder = powders.at(-1)!
  }
  return powders
}
