import type { RawItem } from '../types/item'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/items.sample.json'
import { adaptItem } from './item-adapter'

describe('adaptItem', () => {
  const raw = fixture.items as RawItem[]

  it('normalizes meta fields and requirements', () => {
    const item = adaptItem(raw[0]!)
    expect(item.name).toBe('Adherence')
    expect(item.displayName).toBe('Adherence')
    expect(item.category).toBe('armor')
    expect(item.tier).toBe('Legendary')
    expect(item.level).toBe(105)
    expect(item.requirements.agility).toBe(65)
    expect(item.requirements.defence).toBe(65)
    expect(item.requirements.intelligence).toBe(65)
    expect(item.requirements.strength).toBe(0)
    expect(item.requirements.class).toBeNull()
  })

  it('routes stat fields into stats and keeps meta out', () => {
    const item = adaptItem(raw[0]!)
    expect(item.stats.mr).toBe(10)
    expect(item.stats.sdRaw).toBe(140)
    expect(item.stats.aDef).toBe(150)
    expect(item.stats.fDef).toBe(-100)
    expect(item.stats.lvl).toBeUndefined()
    expect(item.stats.tier).toBeUndefined()
    expect(item.stats.id).toBeUndefined()
  })

  it('defaults optional meta fields', () => {
    const item = adaptItem(raw[2]!)
    expect(item.displayName).toBe('Boundless Helm')
    expect(item.drop).toBe('never')
    expect(item.armourMaterial).toBeNull()
  })

  it('keeps weapon damage strings as stats', () => {
    const item = adaptItem(raw[1]!)
    expect(item.stats.nDam).toBe('100-160')
    expect(item.stats.atkSpd).toBe('NORMAL')
  })

  it('throws when id is missing (stable-id contract)', () => {
    const bad = { name: 'Mystery', category: 'armor', type: 'boots' } as RawItem
    expect(() => adaptItem(bad)).toThrow(/Mystery/)
  })
})
