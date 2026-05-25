import type { RawBuild } from '../codec/build-codec'
import type { AtreeData } from '../types/atree'
// app/lib/build/compute-build.test.ts
import { describe, expect, it } from 'vitest'
import { ATTACK_SPEEDS } from '../math/constants'
import { levelToHPBase } from '../math/skillpoints'
import { computeBuild } from './compute-build'
import { buildRawItemIndex } from './resolve'

// ---------------------------------------------------------------------------
// Synthetic raw-item fixture — a trivial relik weapon + 8 NONE-like armor pieces
// ---------------------------------------------------------------------------

const LEVEL = 10

/** A minimal relik weapon with some fire damage so melee DPS > 0. */
const rawWeapon = {
  id: 1,
  name: 'Test Relik',
  displayName: 'Test Relik',
  category: 'weapon',
  type: 'relik',
  tier: 'Normal',
  slots: 0,
  atkSpd: 'NORMAL',
  // Give it some fire damage so melee avg DPS > 0
  fDam: '50-70',
  nDam: '0-0',
  eDam: '0-0',
  tDam: '0-0',
  wDam: '0-0',
  aDam: '0-0',
}

/** 8 armor pieces (indices 0-7: helmet, chestplate, leggings, boots, ring1, ring2, bracelet, necklace). */
const rawHelmets = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
  id: 100 + i,
  name: `Test Item ${i}`,
  category: i < 4 ? 'armor' : 'accessory',
  type: ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'ring', 'bracelet', 'necklace'][i],
  tier: 'Normal',
  slots: 0,
}))

function makeRawBuild(): RawBuild {
  return {
    versionId: 1,
    // [helmet, chestplate, leggings, boots, ring1, ring2, bracelet, necklace, weapon]
    equipmentIds: [100, 101, 102, 103, 104, 105, 106, 107, 1],
    powders: [[], [], [], [], [], [], [], [], []],
    tomeIds: [],
    // Assign 10 str for testing
    sp: [10, 0, 0, 0, 0],
    level: LEVEL,
    aspects: [],
    activeAtree: [],
  }
}

function makeBuildContext() {
  const allRaw = [...rawHelmets, rawWeapon] as Record<string, unknown>[]
  const rawItemIndex = buildRawItemIndex(allRaw)
  const sets = new Map()
  const atreeData: AtreeData = { Shaman: [] }
  return { rawItemIndex, sets, atreeData }
}

describe('computeBuild (synthetic)', () => {
  it('produces a BuildResult with sensible values', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const result = computeBuild(rawBuild, ctx)

    // HP >= base HP for the level
    expect(result.defense.totalHp).toBeGreaterThanOrEqual(levelToHPBase(LEVEL))

    // Melee DPS > 0 (weapon has fDam 50-70)
    expect(result.melee.averageDps).toBeGreaterThan(0)
    expect(result.melee.perAttack).toBeGreaterThan(0)

    // Attack speed must be one of the known strings
    expect(ATTACK_SPEEDS).toContain(result.melee.attackSpeed)

    // EHP > 0
    expect(result.defense.ehp.withoutAgi).toBeGreaterThan(0)

    // stats map exists
    expect(result.stats).toBeInstanceOf(Map)
    expect(result.stats.get('atkSpd')).toBe('NORMAL')

    // str was overlaid from sp
    expect(result.stats.get('str')).toBe(10)
  })

  it('falls back to finalSkillpoints when sp is null', () => {
    const rawBuild = makeRawBuild()
    rawBuild.sp = null
    const ctx = makeBuildContext()
    const result = computeBuild(rawBuild, ctx)

    // should still produce a result with DPS > 0
    expect(result.melee.averageDps).toBeGreaterThan(0)
    // str should be 0 (no items providing str, no sp assigned)
    expect(result.stats.get('str')).toBe(0)
  })

  it('handles empty atree gracefully', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    // atreeData with empty array is already default — just ensure no throw
    expect(() => computeBuild(rawBuild, ctx)).not.toThrow()
  })
})
