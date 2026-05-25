import type { MergedAbility } from './effect-types'
// app/lib/atree/spell-collect.test.ts
import { describe, expect, it } from 'vitest'
import { DAMAGE_CLASSES } from '../math/constants'
import { DEFAULT_SPELLS, isDamagePart, isDamagePart as isDmg, isHealPart, isTotalPart } from '../math/spells'
import { atreeTranslate, collectAtreeSpells } from './spell-collect'

function merged(...abils: MergedAbility[]): Map<number, MergedAbility> {
  const m = new Map<number, MergedAbility>()
  for (const a of abils)
    m.set(a.id, a)
  return m
}

describe('atreeTranslate', () => {
  it('passes numbers through and resolves property references', () => {
    const m = merged({ id: 50, effects: [], properties: { totem_mul: 2.5 } })
    expect(atreeTranslate(m, 3)).toBe(3)
    expect(atreeTranslate(m, '50.totem_mul')).toBe(2.5)
  })
})

describe('collectAtreeSpells', () => {
  it('seeds the default melee spell as a copy when no spell effects exist', () => {
    const spells = collectAtreeSpells(merged(), 'relik')
    expect(spells.has(0)).toBe(true)
    expect(spells.get(0)!.name).toBe('Relik Melee')
    expect(spells.get(0)).not.toBe(DEFAULT_SPELLS.get('relik')) // copy, not shared
    expect(spells.get(0)!.parts).toHaveLength(2)
  })

  it('adds a new spell from a replace_spell effect (snake→camel mapping)', () => {
    const m = merged({
      id: 100,
      properties: {},
      effects: [{
        type: 'replace_spell',
        name: 'Boosted',
        base_spell: 2,
        use_atkspd: false,
        display: 'Total',
        parts: [{ name: 'Hit', use_str: false, multipliers: [50, 0, 0, 0, 0, 0], ignored_mults: ['Mask'] }],
      } as any],
    })
    const spells = collectAtreeSpells(m, 'relik')
    const s = spells.get(2)!
    expect(s.name).toBe('Boosted')
    expect(s.useAtkspd).toBe(false)
    const part = s.parts[0]!
    expect(isDamagePart(part)).toBe(true)
    if (isDamagePart(part)) {
      expect(part.useStr).toBe(false)
      expect(part.ignoredMults).toEqual(['Mask'])
      expect(part.multipliers[0]).toBe(50)
    }
  })

  it('a replace_spell on base_spell 0 overrides the default melee', () => {
    const m = merged({
      id: 100,
      properties: {},
      effects: [{ type: 'replace_spell', name: 'New Melee', base_spell: 0, parts: [{ name: 'M', multipliers: [200, 0, 0, 0, 0, 0] }] } as any],
    })
    const spells = collectAtreeSpells(m, 'relik')
    expect(spells.get(0)!.name).toBe('New Melee')
  })

  it('resolves property-reference hits in total parts', () => {
    const m = merged({
      id: 50,
      properties: { totem_mul: 2.5 },
      effects: [{
        type: 'replace_spell',
        name: 'Totem',
        base_spell: 1,
        parts: [
          { name: 'Tick', multipliers: [6, 0, 0, 0, 6, 0] },
          { name: 'Total', hits: { Tick: '50.totem_mul' } },
        ],
      } as any],
    })
    const spells = collectAtreeSpells(m, 'relik')
    const total = spells.get(1)!.parts.find(p => p.name === 'Total')!
    expect(isTotalPart(total)).toBe(true)
    if (isTotalPart(total))
      expect(total.hits.Tick).toBe(2.5)
  })

  it('carries heal parts without throwing', () => {
    const m = merged({
      id: 50,
      properties: {},
      effects: [{
        type: 'replace_spell',
        name: 'Heals',
        base_spell: 3,
        parts: [{ name: 'Heal Tick', power: 0.2 }],
      } as any],
    })
    const spells = collectAtreeSpells(m, 'relik')
    const part = spells.get(3)!.parts[0]!
    expect(isHealPart(part)).toBe(true)
    if (isHealPart(part))
      expect(part.power).toBe(0.2)
  })
})

describe('collectAtreeSpells — add_spell_prop & convert_spell_conv', () => {
  function meleeWith(...effects: any[]) {
    const m = new Map<number, import('./effect-types').MergedAbility>()
    m.set(1, { id: 1, properties: {}, effects })
    return m
  }

  it('add_spell_prop merge adds to a part multiplier; overwrite replaces it', () => {
    const mergeAdd = collectAtreeSpells(meleeWith(
      { type: 'add_spell_prop', base_spell: 0, target_part: 'Single Beam', multipliers: [10, 0, 0, 0, 0, 0] },
    ), 'relik')
    const beam = mergeAdd.get(0)!.parts.find(p => p.name === 'Single Beam')!
    if (isDmg(beam))
      expect(beam.multipliers[0]).toBe(43) // 33 + 10

    const ow = collectAtreeSpells(meleeWith(
      { type: 'add_spell_prop', base_spell: 0, target_part: 'Single Beam', behavior: 'overwrite', multipliers: [5, 0, 0, 0, 0, 0] },
    ), 'relik')
    const beam2 = ow.get(0)!.parts.find(p => p.name === 'Single Beam')!
    if (isDmg(beam2))
      expect(beam2.multipliers[0]).toBe(5)
  })

  it('add_spell_prop adds a new part when target not found (merge behavior)', () => {
    const spells = collectAtreeSpells(meleeWith(
      { type: 'add_spell_prop', base_spell: 0, target_part: 'Extra', multipliers: [20, 0, 0, 0, 0, 0] },
    ), 'relik')
    const extra = spells.get(0)!.parts.find(p => p.name === 'Extra')!
    expect(extra).toBeDefined()
    if (isDmg(extra))
      expect(extra.multipliers[0]).toBe(20)
  })

  it('add_spell_prop hide sets part.display=false and display sets spell.display', () => {
    const spells = collectAtreeSpells(meleeWith(
      { type: 'add_spell_prop', base_spell: 0, target_part: 'Single Beam', multipliers: [0, 0, 0, 0, 0, 0], hide: true, display: 'Single Beam' },
    ), 'relik')
    const beam = spells.get(0)!.parts.find(p => p.name === 'Single Beam')!
    expect(beam.display).toBe(false)
    expect(spells.get(0)!.display).toBe('Single Beam')
  })

  it('convert_spell_conv collapses elemental multipliers into one element', () => {
    // Seed a custom spell with mixed elements via replace_spell, then convert all to Fire.
    const m = new Map<number, import('./effect-types').MergedAbility>()
    m.set(1, { id: 1, properties: {}, effects: [
      { type: 'replace_spell', name: 'X', base_spell: 2, parts: [{ name: 'P', multipliers: [10, 4, 6, 0, 0, 0] }] },
      { type: 'convert_spell_conv', base_spell: 2, target_part: 'all', conversion: 'Fire' },
    ] })
    const spells = collectAtreeSpells(m, 'relik')
    const part = spells.get(2)!.parts[0]!
    if (isDmg(part)) {
      const fire = DAMAGE_CLASSES.indexOf('Fire')
      expect(part.multipliers[0]).toBe(10) // neutral preserved
      expect(part.multipliers[fire]).toBe(10) // 4 + 6 collapsed into Fire
      expect(part.multipliers[1]).toBe(0)
      expect(part.multipliers[2]).toBe(0)
    }
  })

  it('skips effects targeting an absent base_spell', () => {
    expect(() => collectAtreeSpells(meleeWith(
      { type: 'add_spell_prop', base_spell: 99, target_part: 'X', multipliers: [1, 0, 0, 0, 0, 0] },
      { type: 'convert_spell_conv', base_spell: 99, target_part: 'all', conversion: 'Fire' },
    ), 'relik')).not.toThrow()
  })
})
