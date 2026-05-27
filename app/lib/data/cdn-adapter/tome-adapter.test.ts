import type { OutputTome } from './tome-adapter'
import { describe, expect, it } from 'vitest'
import fixtureData from '~/../app/lib/data/__fixtures__/cdn/tomes.json'
import { buildRawTomeIndex } from '~/lib/build/resolve'
import { adaptCdnTome } from './tome-adapter'

// Fixture tomes by id
const tomes: OutputTome[] = fixtureData.tomes as OutputTome[]
const byId = Object.fromEntries(tomes.map(t => [t.id, t]))

// --- Unit object (hand-crafted armour_tome) ---

const ARMOUR_TOME_UNIT: OutputTome = {
  id: 999,
  name: 'TestArmorTome',
  displayName: 'Test Armour Tome',
  type: 'armour_tome',
  tier: 'Fabled',
  requirements: { level: 80 },
  identifications: {
    rawHealth: { min: 100, max: 300, raw: 200 },
    earthDefence: { min: 2, max: 8, raw: 6 },
  },
}

// --- Tests: unit armour_tome ---

describe('adaptCdnTome — armour_tome unit', () => {
  const out = adaptCdnTome(ARMOUR_TOME_UNIT)

  it('type remapped to armorTome', () => expect(out.type).toBe('armorTome'))
  it('hpBonus from rawHealth.raw', () => expect(out.hpBonus).toBe(200))
  it('eDefPct from earthDefence.raw', () => expect(out.eDefPct).toBe(6))
  it('lvl from requirements.level', () => expect(out.lvl).toBe(80))
  it('tier passes through', () => expect(out.tier).toBe('Fabled'))
  it('id passes through', () => expect(out.id).toBe(999))
  it('name passes through', () => expect(out.name).toBe('TestArmorTome'))
  it('displayName passes through', () => expect(out.displayName).toBe('Test Armour Tome'))
  it('category is tome', () => expect(out.category).toBe('tome'))
})

// --- Tests: type mapping for all 7 snake_case values ---

describe('adaptCdnTome — TOME_TYPE_MAP', () => {
  const cases: Array<[string, string]> = [
    ['weapon_tome', 'weaponTome'],
    ['armour_tome', 'armorTome'],
    ['guild_tome', 'guildTome'],
    ['lootrun_tome', 'lootrunTome'],
    ['mysticism_tome', 'gatherXpTome'],
    ['marathon_tome', 'mobXpTome'],
    ['expertise_tome', 'dungeonXpTome'],
  ]
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      const t: OutputTome = { ...ARMOUR_TOME_UNIT, type: input }
      expect(adaptCdnTome(t).type).toBe(expected)
    })
  }

  it('unknown type falls back to raw input', () => {
    const t: OutputTome = { ...ARMOUR_TOME_UNIT, type: 'mystery_tome' }
    expect(adaptCdnTome(t).type).toBe('mystery_tome')
  })
})

// --- Tests: fixture tomes ---

describe('adaptCdnTome — fixture tomes', () => {
  it('blooming Tome of Defensive Mastery III (id=165): armorTome, hpBonus=300, eDefPct=9, lvl=120, tier=Fabled', () => {
    const out = adaptCdnTome(byId[165]!)
    expect(out.type).toBe('armorTome')
    expect(out.hpBonus).toBe(300)
    expect(out.eDefPct).toBe(9)
    expect(out.lvl).toBe(120)
    expect(out.tier).toBe('Fabled')
  })

  it('tome of Weapon Mastery I (id=20): weaponTome, damPct=4, lvl=60, tier=Legendary', () => {
    const out = adaptCdnTome(byId[20]!)
    expect(out.type).toBe('weaponTome')
    expect(out.damPct).toBe(4)
    expect(out.lvl).toBe(60)
    expect(out.tier).toBe('Legendary')
  })
})

// --- Tests: round-trip through buildRawTomeIndex ---

describe('adaptCdnTome — round-trip through buildRawTomeIndex', () => {
  it('all fixture tomes pass through buildRawTomeIndex without throwing', () => {
    const adapted = tomes.map(t => adaptCdnTome(t) as Record<string, unknown>)
    expect(() => buildRawTomeIndex(adapted)).not.toThrow()
  })

  it('resolveId returns the adapted tome for Blooming Tome of Defensive Mastery III (id=165) with mapped type', () => {
    const adapted = tomes.map(t => adaptCdnTome(t) as Record<string, unknown>)
    const { resolveId } = buildRawTomeIndex(adapted)
    const resolved = resolveId(165)
    expect(resolved).not.toBeNull()
    expect(resolved!.id).toBe(165)
    expect(resolved!.type).toBe('armorTome')
  })
})
