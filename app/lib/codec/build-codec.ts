import type { AtreeData, AtreeNode } from '../types/atree'
import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { getSortedClassAtree } from '../atree/build-atree'
import { decodeAspects, encodeAspects } from './aspect-codec'
import { decodeAtree, encodeAtree } from './atree-codec'
import { BitVector, BitVectorCursor as Cursor } from './bit-vector'
import { num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'
import { decodeEquipmentNormal, encodeEquipmentNormal } from './equipment-codec'
import { decodeHeader, encodeHeader } from './header'
import { decodeLevel, encodeLevel } from './level-codec'
import { decodeSp } from './skillpoints-codec'
import { decodeTomes, encodeTomes } from './tome-codec'
import { WEP_TO_CLASS } from './wep-to-class'

/** The exact decoded representation of a build, sufficient to re-encode byte-for-byte. */
export interface RawBuild {
  versionId: number
  equipmentIds: Array<number | null>
  powders: number[][]
  tomeIds: Array<number | null>
  sp: Array<number | null> | null
  level: number
  aspects: Array<[number, number] | null>
  activeAtree: number[]
}

export interface DecodeProvider {
  (versionId: number): {
    enc: EncodingConstants
    atreeData: AtreeData
    weaponType: (id: number) => string | null
  }
}

/** Re-emit skillpoints exactly as decodeSp produced them (no delta model). */
function reencodeSp(sp: Array<number | null> | null, enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (sp === null) {
    vec.appendFlag('SP_FLAG', 'AUTOMATIC')
    return vec
  }
  vec.appendFlag('SP_FLAG', 'ASSIGNED')
  const maxSpBitlen = num(enc, 'MAX_SP_BITLEN')
  for (const value of sp) {
    if (value === null) {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_UNASSIGNED')
    }
    else {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_ASSIGNED')
      vec.append(value & ((1 << maxSpBitlen) - 1), maxSpBitlen)
    }
  }
  return vec
}

export function encodeRawBuild(raw: RawBuild, enc: EncodingConstants, sortedTree: AtreeNode[]): string {
  const finalVec = new EncodingBitVector(0, 0, enc)
  finalVec.merge([
    encodeHeader(raw.versionId),
    encodeEquipmentNormal(raw.equipmentIds, raw.powders, enc),
    encodeTomes(raw.tomeIds, enc),
    reencodeSp(raw.sp, enc),
    encodeLevel(raw.level, enc),
    encodeAspects(raw.aspects, enc),
    encodeAtree(sortedTree, new Set(raw.activeAtree)),
  ])
  return finalVec.toB64()
}

export function decodeRawBuild(hash: string, provider: DecodeProvider): RawBuild {
  const vec = new BitVector(hash, hash.length * 6)
  const cursor: BitVectorCursor = new Cursor(vec)
  const versionId = decodeHeader(cursor)
  const { enc, atreeData, weaponType } = provider(versionId)

  const { ids: equipmentIds, powders } = decodeEquipmentNormal(cursor, enc, id => id)
  const tomeIds = decodeTomes(cursor, enc)
  const sp = decodeSp(cursor, enc)
  const level = decodeLevel(cursor, enc)
  const aspects = decodeAspects(cursor, enc)

  const weaponId = equipmentIds[8]
  const wType = weaponId === null || weaponId === undefined ? null : weaponType(weaponId)
  const cls = wType ? WEP_TO_CLASS[wType] : undefined
  const sortedTree = cls ? getSortedClassAtree(atreeData, cls) : []
  const activeAtree = [...decodeAtree(sortedTree, cursor)]

  return { versionId, equipmentIds, powders, tomeIds, sp, level, aspects, activeAtree }
}
