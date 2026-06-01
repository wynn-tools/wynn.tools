import type { Block } from './decode'
import type { CleanedRawItem, RawItemIndex } from '~/lib/build/resolve'
import { describe, expect, it } from 'vitest'
import { DataBlockId } from './decode'
import { parseAndResolveAll, resolveImport } from './import'

function mkItem(id: number, name: string, type: string, idents: Record<string, { min: number, max: number, raw: number }> = {}): CleanedRawItem {
  const category = ['spear', 'wand', 'dagger', 'bow', 'relik'].includes(type) ? 'weapon' : 'armor'
  return {
    id,
    name,
    displayName: name,
    type,
    category,
    identifications: new Map(Object.entries(idents)),
  } as unknown as CleanedRawItem
}

function mkCtx(items: CleanedRawItem[]) {
  const byId = new Map(items.map(i => [i.id as number, i]))
  return {
    rawItemIndex: { byId, resolveId: (id: number) => byId.get(id) ?? null } as RawItemIndex,
  } as any
}

function blocks(name: string, type = 0, idents: { kind: number, roll: number }[] = [], powders: { element: number, tier: number }[] = []): Block[] {
  return [
    { id: DataBlockId.StartData, name: 'StartData', version: 1 },
    { id: DataBlockId.TypeData, name: 'TypeData', itemType: type },
    { id: DataBlockId.NameData, name: 'NameData', nameStr: name },
    { id: DataBlockId.IdentificationData, name: 'IdentificationData', extended: false, identifications: idents.map(i => ({ kind: i.kind, base: null, roll: i.roll })) },
    { id: DataBlockId.PowderData, name: 'PowderData', powderSlots: powders.length, powders },
    { id: DataBlockId.EndData, name: 'EndData' },
  ]
}

const idKeys = new Map<number, string>([
  [12, 'rawStrength'],
  [34, 'mainAttackDamage'],
  [99, 'unmappedV3Name'],
])

describe('resolveImport', () => {
  it('happy path: helmet → slot 0, overrides, no powders', () => {
    const ctx = mkCtx([
      mkItem(7, 'Morph-Stardust', 'helmet', { str: { min: 5, max: 20, raw: 20 }, mdPct: { min: 10, max: 30, raw: 30 } }),
    ])
    const r = resolveImport(blocks('Morph-Stardust', 0, [{ kind: 12, roll: 50 }, { kind: 34, roll: 100 }]), ctx, idKeys, new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.row.slot).toBe(0)
      expect(r.row.itemId).toBe(7)
      expect(r.row.overrides.get('str')).toBe(10)
      expect(r.row.overrides.get('mdPct')).toBe(30)
    }
  })

  it('negative-base clamp: percentile → raw stays in [min(min,max), max(min,max)]', () => {
    const ctx = mkCtx([
      mkItem(8, 'BadRing', 'ring', { spRegen: { min: -2, max: -8, raw: -8 } }),
    ])
    const localKeys = new Map(idKeys).set(50, 'soulPointRegen')
    const r = resolveImport(blocks('BadRing', 0, [{ kind: 50, roll: 100 }]), ctx, localKeys, new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      const v = r.row.overrides.get('spRegen')!
      expect(v).toBeGreaterThanOrEqual(-8)
      expect(v).toBeLessThanOrEqual(-2)
    }
  })

  it('unknown item name → ImportError', () => {
    const ctx = mkCtx([mkItem(7, 'Morph-Stardust', 'helmet')])
    const r = resolveImport(blocks('NotARealItem'), ctx, idKeys, new Set())
    expect(r.ok).toBe(false)
    if (!r.ok)
      expect(r.error.message).toMatch(/not found/i)
  })

  it('unknown stat byte → skipped with warning, others applied', () => {
    const ctx = mkCtx([mkItem(7, 'H', 'helmet', { str: { min: 1, max: 10, raw: 10 } })])
    const r = resolveImport(blocks('H', 0, [{ kind: 12, roll: 100 }, { kind: 200, roll: 50 }]), ctx, idKeys, new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.row.overrides.get('str')).toBe(10)
      expect(r.row.warnings.some(w => /200/.test(w))).toBe(true)
    }
  })

  it('v3 name has no shorthand mapping → skipped with warning', () => {
    const ctx = mkCtx([mkItem(7, 'H', 'helmet', { str: { min: 1, max: 10, raw: 10 } })])
    const r = resolveImport(blocks('H', 0, [{ kind: 99, roll: 50 }, { kind: 12, roll: 100 }]), ctx, idKeys, new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.row.overrides.get('str')).toBe(10)
      expect(r.row.warnings.some(w => /unmappedV3Name/.test(w))).toBe(true)
    }
  })

  it('non-GEAR type byte → ImportError', () => {
    const ctx = mkCtx([mkItem(7, 'H', 'helmet')])
    const r = resolveImport(blocks('H', 1), ctx, idKeys, new Set())
    expect(r.ok).toBe(false)
    if (!r.ok)
      expect(r.error.message).toMatch(/gear/i)
  })

  it('rings: first → slot 4, second → slot 5, third → warning + slot 4', () => {
    const ctx = mkCtx([mkItem(9, 'R', 'ring')])
    const occupied = new Set<number>()
    const a = resolveImport(blocks('R'), ctx, idKeys, occupied)
    if (a.ok)
      occupied.add(a.row.slot)
    const b = resolveImport(blocks('R'), ctx, idKeys, occupied)
    if (b.ok)
      occupied.add(b.row.slot)
    const c = resolveImport(blocks('R'), ctx, idKeys, occupied)
    expect(a.ok && a.row.slot).toBe(4)
    expect(b.ok && b.row.slot).toBe(5)
    expect(c.ok && c.row.slot).toBe(4)
    if (c.ok)
      expect(c.row.warnings.some(w => /ring/i.test(w))).toBe(true)
  })

  it('powders: element/tier pairs → numeric ids in slot powder format', () => {
    const ctx = mkCtx([mkItem(11, 'W', 'spear')])
    const r = resolveImport(blocks('W', 0, [], [{ element: 0, tier: 1 }, { element: 2, tier: 3 }]), ctx, idKeys, new Set())
    expect(r.ok).toBe(true)
    if (r.ok)
      expect(r.row.powders).toEqual([0 * 6 + 0, 2 * 6 + 2])
  })
})

describe('parseAndResolveAll', () => {
  it('routes two ring lines to slots 4 then 5', () => {
    const ctx = mkCtx([mkItem(9, 'Moon Pool Circlet', 'ring')])
    const fakeParse = (line: string) => blocks(line)
    const result = parseAndResolveAll('Moon Pool Circlet\nMoon Pool Circlet', ctx, idKeys, fakeParse)
    expect(result.applied.length).toBe(2)
    expect(result.applied[0].slot).toBe(4)
    expect(result.applied[1].slot).toBe(5)
    expect(result.errors.length).toBe(0)
  })

  it('reports per-line errors without aborting', () => {
    const ctx = mkCtx([mkItem(7, 'Helm', 'helmet')])
    const fakeParse = (line: string) => blocks(line)
    const result = parseAndResolveAll('Helm\nNotReal', ctx, idKeys, fakeParse)
    expect(result.applied.length).toBe(1)
    expect(result.errors.length).toBe(1)
  })
})
