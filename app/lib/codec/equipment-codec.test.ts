import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { decodeEquipmentNormal, encodeEquipmentNormal } from './equipment-codec'

const identity = (id: number) => id

describe('equipment codec (NORMAL)', () => {
  it('round-trips item ids and empty slots', () => {
    const ids = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    const vec = encodeEquipmentNormal(ids, [[], [], [], [], []], SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.ids).toEqual(ids)
  })

  it('handles empty slots (null) as id 0', () => {
    const ids = [null, 200, 300, 400, 500, 600, 700, 800, null]
    const vec = encodeEquipmentNormal(ids, [[], [], [], [], []], SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.ids[0]).toBeNull()
    expect(out.ids[8]).toBeNull()
  })

  it('round-trips per-slot powders', () => {
    const ids = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    const powders = [[26, 26], [], [12], [], [5]]
    const vec = encodeEquipmentNormal(ids, powders, SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.powders[0]).toEqual([26, 26])
    expect(out.powders[2]).toEqual([12])
    expect(out.powders[4]).toEqual([5])
  })
})
