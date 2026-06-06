import type { RawBuild } from '../codec/build-codec'
import { describe, expect, it } from 'vitest'
import { extractBuildMeta } from './build-meta'
import { computeBuild } from './compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from './resolve'

const rawWeapon = {
  id: 1,
  name: 'Test Wand',
  displayName: 'Test Wand',
  category: 'weapon',
  type: 'wand',
  tier: 'Normal',
  slots: 0,
  atkSpd: 'NORMAL',
  fDam: '50-70',
  nDam: '0-0',
  eDam: '0-0',
  tDam: '0-0',
  wDam: '0-0',
  aDam: '0-0',
}

const rawHelmet = {
  id: 100,
  name: 'Test Helmet',
  displayName: 'Test Helmet',
  category: 'armor',
  type: 'helmet',
  tier: 'Normal',
  slots: 0,
}

function makeRawBuild(overrides: Partial<RawBuild> = {}): RawBuild {
  return {
    versionId: 1,
    // slots: [helmet, chestplate, leggings, boots, ring1, ring2, bracelet, necklace, weapon]
    equipment: [
      { kind: 'normal' as const, id: 100 },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: null },
      { kind: 'normal' as const, id: 1 },
    ],
    powders: [[], [], [], [], [], [], [], [], []],
    tomeIds: [],
    sp: null,
    level: 106,
    aspects: [],
    activeAtree: [],
    ...overrides,
  }
}

function makeBuildContext() {
  const rawItemIndex = buildRawItemIndex([rawWeapon as any, rawHelmet as any])
  const tomeIndex = buildRawTomeIndex([])
  return {
    ctx: {
      rawItemIndex,
      sets: new Map(),
      atreeData: { Mage: [] },
      tomeIndex,
      aspectData: {},
    },
    weaponType: (id: number) => (id === 1 ? 'wand' : null),
  }
}

describe('extractBuildMeta', () => {
  it('derives className from weapon type via WEP_TO_CLASS', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.className).toBe('Mage')
  })

  it('falls back to "Build" when weapon slot is empty', () => {
    const { ctx } = makeBuildContext()
    const raw = makeRawBuild({
      equipment: [
        { kind: 'normal', id: 100 },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
      ],
    })
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, () => null, result, null)
    expect(meta.className).toBe('Build')
  })

  it('returns level from rawBuild', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.level).toBe(106)
  })

  it('orders items in builder slot order (Helmet first, Weapon last)', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.items).toHaveLength(9)
    expect(meta.items[0]!.slot).toBe('Helmet')
    expect(meta.items[4]!.slot).toBe('Ring 1')
    expect(meta.items[8]!.slot).toBe('Weapon')
  })

  it('resolves displayName for filled slots', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.items[0]!.name).toBe('Test Helmet') // Helmet
    expect(meta.items[8]!.name).toBe('Test Wand') // Weapon
  })

  it('uses em dash for null/empty slots', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    // slots 1-7 (chestplate through necklace) are null
    expect(meta.items[1]!.name).toBe('—') // Chestplate
    expect(meta.items[7]!.name).toBe('—') // Necklace
  })

  it('reads ehp and totalHp from result', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.ehp).toBe(result.defense.ehp.withAgi)
    expect(meta.totalHp).toBe(result.defense.totalHp)
  })

  it('builds top combat lines, highest dps first, max 4, melee included', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.combatLines.length).toBeLessThanOrEqual(4)
    // Sorted descending by dps; every line is positive.
    for (let i = 1; i < meta.combatLines.length; i++)
      expect(meta.combatLines[i - 1]!.dps).toBeGreaterThanOrEqual(meta.combatLines[i]!.dps)
    for (const line of meta.combatLines)
      expect(line.dps).toBeGreaterThan(0)
    // The melee line carries the melee averageDps.
    const melee = meta.combatLines.find(l => l.dps === result.melee.averageDps)
    expect(melee).toBeDefined()
  })

  it('passes through the build name and falls back to null', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    expect(
      extractBuildMeta(raw, ctx as any, weaponType, result, 'My Build').name,
    ).toBe('My Build')
    expect(
      extractBuildMeta(raw, ctx as any, weaponType, result, null).name,
    ).toBeNull()
  })

  it('emits 5 SP circles from finalSkillpoints (inactive when 0)', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.sp).toHaveLength(5)
    const str = meta.sp[0]!
    expect(str.skill).toBe('strength')
    expect(str.value).toBe(result.skillpoints.finalSkillpoints[0])
    // The plain Normal test build assigns no skill points → inactive.
    expect(str.active).toBe(false)
    expect(str.discUrl).toContain('sp/disabled.png')
    expect(str.iconUrl).toContain('sp/strength_off.png')
  })

  it('defaults credits and tags to empty arrays when not provided', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    expect(meta.credits).toEqual([])
    expect(meta.tags).toEqual([])
  })

  it('passes through credits and tags when provided', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const credits = [{ username: 'alice', name: 'Alice' }]
    const tags = ['dps', 'raid']
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null, credits, tags)
    expect(meta.credits).toEqual(credits)
    expect(meta.tags).toEqual(tags)
  })

  it('maps non-zero elemental defenses with icons and signs', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result, null)
    const ELEMENTS = ['earth', 'thunder', 'water', 'fire', 'air']
    const expected = result.defense.elementalDefenses
      .map((v, i) => ({ element: ELEMENTS[i]!, rounded: Math.round(v) }))
      .filter(e => e.rounded !== 0)
    expect(meta.elementalDefenses).toHaveLength(expected.length)
    for (const def of meta.elementalDefenses) {
      expect(def.iconUrl).toContain(`attributes/${def.element}.png`)
      expect(def.value.startsWith('+') || def.value.startsWith('-')).toBe(true)
    }
  })
})
