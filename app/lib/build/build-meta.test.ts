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
    equipmentIds: [100, null, null, null, null, null, null, null, 1],
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
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.className).toBe('Mage')
  })

  it('falls back to "Build" when weapon slot is empty', () => {
    const { ctx } = makeBuildContext()
    const raw = makeRawBuild({ equipmentIds: [100, null, null, null, null, null, null, null, null] })
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, () => null, result)
    expect(meta.className).toBe('Build')
  })

  it('returns level from rawBuild', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.level).toBe(106)
  })

  it('orders items with Weapon first, then Helmet through Necklace', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.items).toHaveLength(9)
    expect(meta.items[0]!.slot).toBe('Weapon')
    expect(meta.items[1]!.slot).toBe('Helmet')
    expect(meta.items[8]!.slot).toBe('Necklace')
  })

  it('resolves displayName for filled slots', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.items[0]!.name).toBe('Test Wand')
    expect(meta.items[1]!.name).toBe('Test Helmet')
  })

  it('uses em dash for null/empty slots', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    // slots 1-7 (chestplate through necklace) are null
    expect(meta.items[2]!.name).toBe('—') // Chestplate
    expect(meta.items[8]!.name).toBe('—') // Necklace
  })

  it('reads dps from result.melee.averageDps', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.dps).toBe(result.melee.averageDps)
    expect(typeof meta.dps).toBe('number')
  })

  it('reads ehp from result.defense.ehp.withAgi', () => {
    const { ctx, weaponType } = makeBuildContext()
    const raw = makeRawBuild()
    const result = computeBuild(raw, ctx as any)
    const meta = extractBuildMeta(raw, ctx as any, weaponType, result)
    expect(meta.ehp).toBe(result.defense.ehp.withAgi)
    expect(typeof meta.ehp).toBe('number')
  })
})
