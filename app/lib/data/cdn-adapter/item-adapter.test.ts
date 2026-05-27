import type { OutputItem } from './item-adapter'
import { describe, expect, it } from 'vitest'
import fixtureData from '~/../app/lib/data/__fixtures__/cdn/items.json'
import { buildRawItemIndex } from '~/lib/build/resolve'
import { adaptCdnItem } from './item-adapter'

// Fixture items by id
const items: OutputItem[] = fixtureData.items as OutputItem[]
const byId = Object.fromEntries(items.map(i => [i.id, i]))

// --- Unit objects (hand-crafted) ---

const WEAPON_UNIT: OutputItem = {
  id: 42,
  name: 'TestBlade',
  displayName: 'Test Blade',
  type: 'weapon',
  subType: 'dagger',
  tier: 'Rare',
  attackSpeed: 'superFast',
  powderSlots: 2,
  dropRestriction: 'lootchest',
  set: null,
  lore: null,
  majorIds: [],
  base: {
    damage: { min: 80, max: 120, raw: 80 },
    fireDamage: { min: 10, max: 20, raw: 10 },
  },
  requirements: {
    level: 50,
    classRequirement: 'assassin',
    strength: 0,
    dexterity: 30,
    intelligence: 0,
    defence: 0,
    agility: 0,
  },
  identifications: {
    walkSpeed: { min: 5, max: 10, raw: 8 },
    combatExperience: { min: 3, max: 13, raw: 10 },
  },
}

const ARMOUR_UNIT: OutputItem = {
  id: 99,
  name: 'TestHelm',
  displayName: 'Test Helm',
  type: 'armour',
  subType: 'helmet',
  tier: 'Legendary',
  attackSpeed: null,
  powderSlots: 3,
  dropRestriction: 'never',
  set: null,
  lore: [{ color: '#aaaaaa', font: 'ascii', text: 'a' }, { text: 'b' }],
  majorIds: [{ name: 'Fission', description: [{ text: 'explodes' }] }],
  base: {
    health: 1000,
    earthDefence: 50,
    airDefence: -25,
  },
  requirements: {
    level: 80,
    classRequirement: null,
    strength: 40,
    dexterity: 0,
    intelligence: 0,
    defence: 0,
    agility: 0,
  },
  identifications: {
    rawStrength: { min: 5, max: 5, raw: 5 },
  },
}

// --- Tests ---

describe('adaptCdnItem — weapon unit', () => {
  const out = adaptCdnItem(WEAPON_UNIT)

  it('category is "weapon"', () => expect(out.category).toBe('weapon'))
  it('type is subType', () => expect(out.type).toBe('dagger'))
  it('nDam is min-max string', () => expect(out.nDam).toBe('80-120'))
  it('fDam is min-max string', () => expect(out.fDam).toBe('10-20'))
  it('atkSpd is UPPER_SNAKE', () => expect(out.atkSpd).toBe('SUPER_FAST'))
  it('lvl mapped from level', () => expect(out.lvl).toBe(50))
  it('classReq mapped from classRequirement', () => expect(out.classReq).toBe('assassin'))
  it('dexReq mapped', () => expect(out.dexReq).toBe(30))
  it('combatExperience → xpb with raw value', () => expect(out.xpb).toBe(10))
  it('walkSpeed → spd with raw value', () => expect(out.spd).toBe(8))
  it('slots = powderSlots', () => expect(out.slots).toBe(2))
  it('drop = dropRestriction', () => expect(out.drop).toBe('lootchest'))
  it('id passes through', () => expect(out.id).toBe(42))
  it('name passes through', () => expect(out.name).toBe('TestBlade'))
  it('displayName passes through', () => expect(out.displayName).toBe('Test Blade'))
  it('tier passes through', () => expect(out.tier).toBe('Rare'))
  it('set passes through', () => expect(out.set).toBeNull())
  it('lore is empty string when null', () => expect(out.lore).toBe(''))
  it('majorIds is empty array when []', () => expect(out.majorIds).toEqual([]))
})

describe('adaptCdnItem — armour unit', () => {
  const out = adaptCdnItem(ARMOUR_UNIT)

  it('category is "armor" (US spelling, not armour)', () => expect(out.category).toBe('armor'))
  it('type is subType', () => expect(out.type).toBe('helmet'))
  it('atkSpd is empty string for null attackSpeed', () => expect(out.atkSpd).toBe(''))
  it('hp is a plain number', () => expect(out.hp).toBe(1000))
  it('eDef is a plain number', () => expect(out.eDef).toBe(50))
  it('aDef is a plain number (negative)', () => expect(out.aDef).toBe(-25))
  it('no nDam key on armour (no base damage)', () => expect('nDam' in out).toBe(false))
  it('lore joined text: "ab"', () => expect(out.lore).toBe('ab'))
  it('majorIds is array of name strings', () => expect(out.majorIds).toEqual(['Fission']))
  it('rawStrength → str', () => expect(out.str).toBe(5))
})

describe('adaptCdnItem — atkSpd variants', () => {
  const speeds: Array<[string, string]> = [
    ['superFast', 'SUPER_FAST'],
    ['veryFast', 'VERY_FAST'],
    ['fast', 'FAST'],
    ['normal', 'NORMAL'],
    ['slow', 'SLOW'],
    ['verySlow', 'VERY_SLOW'],
    ['superSlow', 'SUPER_SLOW'],
  ]
  for (const [input, expected] of speeds) {
    it(`${input} → ${expected}`, () => {
      const item: OutputItem = { ...WEAPON_UNIT, attackSpeed: input }
      expect(adaptCdnItem(item).atkSpd).toBe(expected)
    })
  }
})

describe('adaptCdnItem — fixture items', () => {
  it('dondasch (id=0): armour chestplate, category armor, hp 3375, aDef 150', () => {
    const out = adaptCdnItem(byId[0]!)
    expect(out.category).toBe('armor')
    expect(out.type).toBe('chestplate')
    expect(out.hp).toBe(3375)
    expect(out.aDef).toBe(150)
    expect(out.atkSpd).toBe('')
  })

  it('eidolon (id=1): weapon wand, aDam "525-575", combatExperience → xpb=10', () => {
    const out = adaptCdnItem(byId[1]!)
    expect(out.category).toBe('weapon')
    expect(out.type).toBe('wand')
    expect(out.aDam).toBe('525-575')
    expect(out.xpb).toBe(10)
    expect(out.atkSpd).toBe('SUPER_SLOW')
  })

  it('nona (id=2): weapon dagger, classReq assassin, superFast → SUPER_FAST', () => {
    const out = adaptCdnItem(byId[2]!)
    expect(out.classReq).toBe('assassin')
    expect(out.atkSpd).toBe('SUPER_FAST')
    expect(out.category).toBe('weapon')
  })

  it('breakbore (id=4): weapon spear, nDam "120-200", eDam "160-240", tDam "160-240"', () => {
    const out = adaptCdnItem(byId[4]!)
    expect(out.nDam).toBe('120-200')
    expect(out.eDam).toBe('160-240')
    expect(out.tDam).toBe('160-240')
    expect(out.atkSpd).toBe('VERY_SLOW')
  })
})

describe('adaptCdnItem — round-trip through buildRawItemIndex', () => {
  it('all fixture items pass through buildRawItemIndex without throwing', () => {
    const adapted = items.map(i => adaptCdnItem(i) as Record<string, unknown>)
    expect(() => buildRawItemIndex(adapted)).not.toThrow()
  })

  it('resolveId returns the adapted item for each fixture id', () => {
    const adapted = items.map(i => adaptCdnItem(i) as Record<string, unknown>)
    const index = buildRawItemIndex(adapted)
    for (const item of items) {
      const resolved = index.resolveId(item.id)
      expect(resolved).not.toBeNull()
      expect(resolved!.id).toBe(item.id)
    }
  })
})
