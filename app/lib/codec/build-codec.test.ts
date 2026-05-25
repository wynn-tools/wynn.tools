import type { AtreeData } from '../types/atree'
import type { RawBuild } from './build-codec'
import { describe, expect, it } from 'vitest'
import atreeFixture from '../atree/__fixtures__/atree.sample.json'
import { getSortedClassAtree } from '../atree/build-atree'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { decodeRawBuild, encodeRawBuild } from './build-codec'

const sortedArcher = getSortedClassAtree(atreeFixture as AtreeData, 'Archer')

function provider(_versionId: number) {
  return {
    enc: SYNTHETIC_ENC,
    atreeData: atreeFixture as AtreeData,
    weaponType: (_id: number) => 'bow',
  }
}

describe('build-codec round-trip', () => {
  it('round-trips a synthetic build to identical base64', () => {
    const raw: RawBuild = {
      versionId: 30,
      equipmentIds: [100, 200, 300, 400, 500, 600, 700, 800, 900],
      powders: [[26, 26], [], [12], [], [5]],
      tomeIds: [10, null, null, null, null, null, null],
      sp: [5, null, -3, 100, -50],
      level: 105,
      aspects: [[5, 1], null, [42, 4], null, [7, 7]],
      activeAtree: [100, 101, 103],
    }
    const hash = encodeRawBuild(raw, SYNTHETIC_ENC, sortedArcher)
    const decoded = decodeRawBuild(hash, provider)
    const rehash = encodeRawBuild(decoded, SYNTHETIC_ENC, sortedArcher)
    expect(rehash).toBe(hash)
    expect(decoded.equipmentIds).toEqual(raw.equipmentIds)
    expect(decoded.level).toBe(105)
    expect([...decoded.activeAtree].sort((a, b) => a - b)).toEqual([100, 101, 103])
  })
})
