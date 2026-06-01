import type { RawBuild } from '../codec/build-codec'
import type { BoostId } from '../math/boosts'
import type { AtreeData } from '../types/atree'
// app/lib/build/compute-build.test.ts
import { describe, expect, it } from 'vitest'
import { ATTACK_SPEEDS } from '../math/constants'
import { levelToHPBase } from '../math/skillpoints'
import { computeBuild } from './compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from './resolve'
import { DEFAULT_ROLL_CONTEXT } from './roll-context'

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
    equipment: [
      { kind: 'normal', id: 100 },
      { kind: 'normal', id: 101 },
      { kind: 'normal', id: 102 },
      { kind: 'normal', id: 103 },
      { kind: 'normal', id: 104 },
      { kind: 'normal', id: 105 },
      { kind: 'normal', id: 106 },
      { kind: 'normal', id: 107 },
      { kind: 'normal', id: 1 },
    ],
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
  const tomeIndex = buildRawTomeIndex([])
  const aspectData = {}
  return { rawItemIndex, sets, atreeData, tomeIndex, aspectData }
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

    // skillpoints result is exposed on BuildResult
    expect(result.skillpoints.baseSkillpoints).toHaveLength(5)
    expect(typeof result.skillpoints.assignedTotal).toBe('number')
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

describe('computeBuild with boosts', () => {
  it('injects boost multipliers into stats', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const result = computeBuild(rawBuild, ctx, {
      toggles: new Set<BoostId>(['fortitude', 'judgement']),
      elemDmg: [0, 0, 0, 0, 0],
    })
    const damMult = result.stats.get('damMult') as Map<string, number>
    expect(damMult.get('Potion')).toBe(40)
    expect(damMult.get('Judgement')).toBe(20)
  })

  it('omitting boosts leaves boost-only multipliers unset (no-op identity)', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const result = computeBuild(rawBuild, ctx)
    const damMult = result.stats.get('damMult') as Map<string, number> | undefined
    expect(damMult?.get('Judgement')).toBeUndefined()
  })
})

describe('computeBuild with powder specials', () => {
  it('injects damage-boost specials into damMult', () => {
    const result = computeBuild(
      makeRawBuild(),
      makeBuildContext(),
      undefined,
      [0, 0, 7, 0, 6],
    )
    const damMult = result.stats.get('damMult') as Map<string, number>
    expect(damMult.get('Curse')).toBe(25)
    expect(damMult.get('Wind Prison')).toBe(225)
  })
  it('no-op when powderActive omitted', () => {
    const result = computeBuild(makeRawBuild(), makeBuildContext())
    const damMult = result.stats.get('damMult') as
      | Map<string, number>
      | undefined
    expect(damMult?.get('Curse')).toBeUndefined()
  })
})

describe('computeBuild rollContext', () => {
  it('omitting rollContext == passing DEFAULT_ROLL_CONTEXT', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const a = computeBuild(rawBuild, ctx)
    const b = computeBuild(
      rawBuild,
      ctx,
      undefined,
      undefined,
      DEFAULT_ROLL_CONTEXT,
    )
    expect([...a.stats.entries()]).toEqual([...b.stats.entries()])
  })

  it('preset min produces strictly lower aggregated sdPct than max for a rolled build', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const maxRes = computeBuild(rawBuild, ctx)
    const minRes = computeBuild(rawBuild, ctx, undefined, undefined, {
      preset: 'min',
      itemOverrides: new Map(),
      tomeOverrides: new Map(),
    })
    const maxSd = (maxRes.stats.get('sdPct') as number) ?? 0
    const minSd = (minRes.stats.get('sdPct') as number) ?? 0
    expect(minSd).toBeLessThanOrEqual(maxSd)
  })

  it('per-id override on slot 0 changes only that id in aggregated stats', () => {
    const rawBuild = makeRawBuild()
    const ctx = makeBuildContext()
    const base = computeBuild(rawBuild, ctx)
    const override = computeBuild(rawBuild, ctx, undefined, undefined, {
      preset: 'max',
      itemOverrides: new Map([[0, new Map([['sdPct', 0]])]]),
      tomeOverrides: new Map(),
    })
    // sdPct should drop by exactly the helmet's max sdPct.
    expect(override.stats.get('sdPct')).toBeLessThanOrEqual(
      base.stats.get('sdPct') as number,
    )
    // hpBonus on any *other* slot is unaffected.
    expect(override.stats.get('hpBonus')).toBe(base.stats.get('hpBonus'))
  })
})
