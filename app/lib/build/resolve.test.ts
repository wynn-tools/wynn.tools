import { describe, expect, it } from 'vitest'
import { expandItem } from '../math/expand-item'
import {
  applyArmorPowders,
  buildRawItemIndex,
  cleanRawItem,
  NONE_RAW_ITEMS,
  resolveBuildItems,
} from './resolve'

describe('cleanRawItem', () => {
  it('builds skillpoints/reqs and defaults, without mutating input', () => {
    const raw = { name: 'X', id: 1, category: 'armor', type: 'helmet', str: 5, strReq: 10, hp: 100 }
    const cleaned = cleanRawItem(raw)
    expect(cleaned.skillpoints).toEqual([5, 0, 0, 0, 0])
    expect(cleaned.reqs).toEqual([10, 0, 0, 0, 0])
    expect(cleaned.majorIds).toEqual([])
    expect(cleaned.hp).toBe(100)
    expect(cleaned.name).toBe('X')
    // Unset numeric fields default to 0
    expect(cleaned.eDef).toBe(0)
    expect(cleaned.slots).toBe(0)
    // String fields (in str_item_fields) default to empty string
    expect(cleaned.atkSpd).toBe('') // atkSpd IS in str_item_fields
    // Non-string fields (nDam etc. are NOT in str_item_fields) default to 0
    expect(cleaned.nDam).toBe(0)
    // Input is untouched
    expect((raw as any).skillpoints).toBeUndefined()
    expect((raw as any).reqs).toBeUndefined()
  })

  it('sets has_negstat true when any skillpoint is negative', () => {
    const raw = { name: 'Y', id: 2, category: 'armor', type: 'helmet', str: -5 }
    const cleaned = cleanRawItem(raw)
    expect(cleaned.has_negstat).toBe(true)
    expect(cleaned.skillpoints).toEqual([-5, 0, 0, 0, 0])
  })

  it('sets displayName from name if missing', () => {
    const raw = { name: 'Foo', id: 3, category: 'armor', type: 'helmet' }
    const cleaned = cleanRawItem(raw)
    expect(cleaned.displayName).toBe('Foo')
  })

  it('preserves existing displayName', () => {
    const raw = { name: 'Foo', displayName: 'Bar', id: 4, category: 'armor', type: 'helmet' }
    const cleaned = cleanRawItem(raw)
    expect(cleaned.displayName).toBe('Bar')
  })

  it('does not process remapID items (returns them as-is)', () => {
    const raw = { id: 5, remapID: 6 }
    const cleaned = cleanRawItem(raw)
    // remapID items are redirects — cleanRawItem returns them unchanged
    expect(cleaned.remapID).toBe(6)
    expect((cleaned as any).skillpoints).toBeUndefined()
  })
})

describe('nONE_RAW_ITEMS', () => {
  it('has 9 entries', () => {
    expect(NONE_RAW_ITEMS).toHaveLength(9)
  })

  it('each has fixID true and zero skillpoints/reqs', () => {
    for (const item of NONE_RAW_ITEMS) {
      expect(item.fixID).toBe(true)
      expect(item.skillpoints).toEqual([0, 0, 0, 0, 0])
      expect(item.reqs).toEqual([0, 0, 0, 0, 0])
    }
  })

  it('each has zero damage strings', () => {
    for (const item of NONE_RAW_ITEMS) {
      expect(item.nDam).toBe('0-0')
      expect(item.eDam).toBe('0-0')
      expect(item.tDam).toBe('0-0')
      expect(item.wDam).toBe('0-0')
      expect(item.fDam).toBe('0-0')
      expect(item.aDam).toBe('0-0')
    }
  })

  it('ids are 10000..10008', () => {
    for (let i = 0; i < 9; i++) {
      expect(NONE_RAW_ITEMS[i]!.id).toBe(10000 + i)
    }
  })

  it('slot order: armor(4), accessory(4), weapon', () => {
    expect(NONE_RAW_ITEMS[0]!.category).toBe('armor')
    expect(NONE_RAW_ITEMS[0]!.type).toBe('helmet')
    expect(NONE_RAW_ITEMS[1]!.type).toBe('chestplate')
    expect(NONE_RAW_ITEMS[2]!.type).toBe('leggings')
    expect(NONE_RAW_ITEMS[3]!.type).toBe('boots')
    expect(NONE_RAW_ITEMS[4]!.category).toBe('accessory')
    expect(NONE_RAW_ITEMS[4]!.type).toBe('ring')
    expect(NONE_RAW_ITEMS[5]!.type).toBe('ring')
    expect(NONE_RAW_ITEMS[6]!.type).toBe('bracelet')
    expect(NONE_RAW_ITEMS[7]!.type).toBe('necklace')
    expect(NONE_RAW_ITEMS[8]!.category).toBe('weapon')
    expect(NONE_RAW_ITEMS[8]!.type).toBe('dagger')
  })
})

describe('buildRawItemIndex', () => {
  const rawHelmet = { name: 'Helm', id: 1, category: 'armor', type: 'helmet', slots: 2 }
  const rawWeapon = { name: 'Sword', id: 2, category: 'weapon', type: 'sword', nDam: '10-20', atkSpd: 'NORMAL' }
  const rawRedir = { id: 3, remapID: 1 }

  it('resolveId returns cleaned item by id', () => {
    const { resolveId } = buildRawItemIndex([rawHelmet, rawWeapon, rawRedir])
    const item = resolveId(1)
    expect(item).not.toBeNull()
    expect(item!.name).toBe('Helm')
    expect(item!.skillpoints).toBeDefined()
  })

  it('resolveId follows remapID redirect', () => {
    const { resolveId } = buildRawItemIndex([rawHelmet, rawWeapon, rawRedir])
    const item = resolveId(3)
    expect(item).not.toBeNull()
    expect(item!.id).toBe(1)
  })

  it('resolveId returns null for unknown id', () => {
    const { resolveId } = buildRawItemIndex([rawHelmet])
    expect(resolveId(999)).toBeNull()
  })

  it('resolveId returns NONE item for ids 10000..10008', () => {
    const { resolveId } = buildRawItemIndex([rawHelmet])
    for (let i = 0; i < 9; i++) {
      const item = resolveId(10000 + i)
      expect(item).not.toBeNull()
      expect(item!.id).toBe(10000 + i)
      expect(item!.fixID).toBe(true)
    }
  })

  it('resolveId cycle-guards redirect chains', () => {
    // id 10 → 11, id 11 → 10 — cycle, should return null
    const rawA = { id: 10, remapID: 11 }
    const rawB = { id: 11, remapID: 10 }
    const { resolveId } = buildRawItemIndex([rawA, rawB])
    expect(resolveId(10)).toBeNull()
  })
})

describe('applyArmorPowders', () => {
  // Powder id 0 = e1 (earth tier 1): defPlus=2, defMinus=1
  // element index = 0 → 'e'; prevElement = SKP_ELEMENTS[(0+4)%5] = SKP_ELEMENTS[4] = 'a'
  // so eDef += 2, aDef -= 1, hp += POWDER_ARMOR_HEALTH[0 % 7] = 5
  it('applies earth t1 powder (id=0): eDef+2, aDef-1, hp+5', () => {
    const rawItem = {
      name: 'TestHelm',
      id: 1,
      category: 'armor',
      type: 'helmet',
      fixID: true,
      eDef: 10,
      aDef: 5,
      hp: 100,
    }
    const m = expandItem(rawItem)
    m.set('powders', [0]) // earth t1
    applyArmorPowders(m)
    expect(m.get('eDef')).toBe(12) // 10 + 2
    expect(m.get('aDef')).toBe(4) // 5 - 1
    expect(m.get('hp')).toBe(105) // 100 + 5
  })

  it('applies thunder t1 powder (id=7): tDef+2, eDef-1, hp+5', () => {
    // id=7 → element index = floor(7/7)=1 → 't'; prevElement = SKP_ELEMENTS[(1+4)%5]=SKP_ELEMENTS[0]='e'
    // POWDER_STATS[7].defPlus=2, defMinus=1; POWDER_ARMOR_HEALTH[7%7=0]=5
    const rawItem = {
      name: 'TestHelm2',
      id: 2,
      category: 'armor',
      type: 'helmet',
      fixID: true,
      tDef: 10,
      eDef: 5,
      hp: 50,
    }
    const m = expandItem(rawItem)
    m.set('powders', [7]) // thunder t1
    applyArmorPowders(m)
    expect(m.get('tDef')).toBe(12) // 10 + 2
    expect(m.get('eDef')).toBe(4) // 5 - 1
    expect(m.get('hp')).toBe(55) // 50 + 5
  })
})

describe('resolveBuildItems', () => {
  const rawHelmet = {
    name: 'TestHelmet',
    id: 1,
    category: 'armor',
    type: 'helmet',
    slots: 1,
    fixID: true,
    eDef: 10,
    hp: 200,
  }
  const rawWeapon = {
    name: 'TestSword',
    id: 2,
    category: 'weapon',
    type: 'sword',
    fixID: true,
    nDam: '10-20',
    atkSpd: 'NORMAL',
    slots: 1,
  }

  const rawBuild = {
    versionId: 0,
    equipmentIds: [1, null, null, null, null, null, null, null, 2] as Array<number | null>,
    powders: [
      [0], // helmet slot — earth t1
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [0], // weapon slot — earth t1
    ],
    tomeIds: [],
    sp: null,
    level: 100,
    aspects: [],
    activeAtree: [],
  }

  it('returns 8 equipment + 1 weapon', () => {
    const index = buildRawItemIndex([rawHelmet, rawWeapon])
    const result = resolveBuildItems(rawBuild, index)
    expect(result.equipment).toHaveLength(8)
    expect(result.weapon).toBeDefined()
    expect(result.allItems).toHaveLength(9)
    expect(result.wynnOrder).toHaveLength(8)
  })

  it('null equipment slots use NONE items', () => {
    const index = buildRawItemIndex([rawHelmet, rawWeapon])
    const result = resolveBuildItems(rawBuild, index)
    // slots 1-7 are null → NONE
    for (let i = 1; i < 8; i++) {
      expect(result.equipment[i]!.get('fixID')).toBe(true)
    }
    // slot 0 is the real helmet
    expect(result.equipment[0]!.get('name')).toBe('TestHelmet')
  })

  it('weapon has damagePresent set after applyWeaponPowders', () => {
    const index = buildRawItemIndex([rawHelmet, rawWeapon])
    const result = resolveBuildItems(rawBuild, index)
    expect(result.weapon.get('damagePresent')).toBeDefined()
  })

  it('armor slot gets powder applied: eDef bumped', () => {
    const index = buildRawItemIndex([rawHelmet, rawWeapon])
    const result = resolveBuildItems(rawBuild, index)
    // earth t1 powder: eDef += 2
    const helmMap = result.equipment[0]!
    const eDef = helmMap.get('eDef') as number
    expect(eDef).toBe(12) // 10 + 2
  })

  it('wynnOrder is [boots(3), leggings(2), chestplate(1), helmet(0), ring1(4), ring2(5), bracelet(6), necklace(7)]', () => {
    const index = buildRawItemIndex([rawHelmet, rawWeapon])
    const result = resolveBuildItems(rawBuild, index)
    // helmet is at equipment[0], wynnOrder[3] should be it
    expect(result.wynnOrder[3]).toBe(result.equipment[0])
    // others are NONE items
    expect(result.wynnOrder[0]).toBe(result.equipment[3]) // boots
    expect(result.wynnOrder[1]).toBe(result.equipment[2]) // leggings
    expect(result.wynnOrder[2]).toBe(result.equipment[1]) // chestplate
  })
})
