import type { Block } from './decode'
import type { CleanedRawItem, RawItemIndex } from '~/lib/build/resolve'
import { describe, expect, it } from 'vitest'
import { analyzeItem } from './analyze'
import { DataBlockId } from './decode'

function mockGetRange(item: CleanedRawItem, shorthand: string) {
  const idents = (item as unknown as { identifications: Map<string, { min: number, max: number, raw: number }> }).identifications
  return idents.get(shorthand) ?? null
}

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

function blocks(opts: {
  name?: string
  type?: number
  idents?: { kind: number, roll: number }[] | null
  powders?: { element: number, tier: number }[]
  reroll?: number
} = {}): Block[] {
  const out: Block[] = [
    { id: DataBlockId.StartData, name: 'StartData', version: 1 },
    { id: DataBlockId.TypeData, name: 'TypeData', itemType: opts.type ?? 0 },
    { id: DataBlockId.NameData, name: 'NameData', nameStr: opts.name ?? 'Item' },
  ]
  if (opts.idents !== null) {
    out.push({
      id: DataBlockId.IdentificationData,
      name: 'IdentificationData',
      extended: false,
      identifications: (opts.idents ?? []).map(i => ({ kind: i.kind, base: null, roll: i.roll })),
    })
  }
  out.push({
    id: DataBlockId.PowderData,
    name: 'PowderData',
    powderSlots: opts.powders?.length ?? 0,
    powders: opts.powders ?? [],
  })
  if (opts.reroll != null)
    out.push({ id: DataBlockId.RerollData, name: 'RerollData', rerollCount: opts.reroll })
  out.push({ id: DataBlockId.EndData, name: 'EndData' })
  return out
}

const idKeys = new Map<number, string>([
  [12, 'rawStrength'],
  [34, 'mainAttackDamage'],
])

describe('analyzeItem', () => {
  it('returns identified result with per-stat roll percentages', () => {
    const ctx = mkCtx([
      mkItem(7, 'Morph-Stardust', 'helmet', {
        str: { min: 5, max: 20, raw: 20 },
        mdPct: { min: 10, max: 30, raw: 30 },
      }),
    ])
    const r = analyzeItem(
      blocks({ name: 'Morph-Stardust', idents: [{ kind: 12, roll: 50 }, { kind: 34, roll: 100 }], powders: [{ element: 0, tier: 1 }], reroll: 2 }),
      ctx,
      idKeys,
      mockGetRange,
    )
    expect(r.ok).toBe(true)
    if (!r.ok)
      return
    expect(r.view.identified).toBe(true)
    expect(r.view.identifications).toHaveLength(2)
    const str = r.view.identifications.find(x => x.shorthand === 'str')!
    expect(str.actual).toBe(10)
    expect(str.rollPct).not.toBeNull()
    expect(str.rollPct!).toBeGreaterThanOrEqual(0)
    expect(str.rollPct!).toBeLessThanOrEqual(100)
    const md = r.view.identifications.find(x => x.shorthand === 'mdPct')!
    expect(md.actual).toBe(30)
    expect(md.rollPct).toBe(100)
    expect(r.view.overall).not.toBeNull()
    expect(r.view.powders).toEqual([0])
    expect(r.view.rerollCount).toBe(2)
    expect(r.view.shiny).toBeNull()
  })

  it('returns identified: false for unidentified gear (no IdentificationData block)', () => {
    const ctx = mkCtx([mkItem(7, 'Plain', 'helmet')])
    const r = analyzeItem(blocks({ name: 'Plain', idents: null }), ctx, idKeys, mockGetRange)
    expect(r.ok).toBe(true)
    if (!r.ok)
      return
    expect(r.view.identified).toBe(false)
    expect(r.view.identifications).toEqual([])
    expect(r.view.overall).toBeNull()
  })

  it('returns unsupported-type error for non-gear items', () => {
    const ctx = mkCtx([mkItem(7, 'Crafted', 'helmet')])
    const r = analyzeItem(blocks({ name: 'Crafted', type: 1 }), ctx, idKeys, mockGetRange)
    expect(r.ok).toBe(false)
    if (r.ok)
      return
    expect(r.error.kind).toBe('unsupported-type')
    if (r.error.kind === 'unsupported-type')
      expect(r.error.itemType).toBe(1)
  })

  it('returns unknown-item error when name is not in BuildContext', () => {
    const ctx = mkCtx([mkItem(7, 'Other', 'helmet')])
    const r = analyzeItem(blocks({ name: 'NotARealItem' }), ctx, idKeys, mockGetRange)
    expect(r.ok).toBe(false)
    if (r.ok)
      return
    expect(r.error.kind).toBe('unknown-item')
    if (r.error.kind === 'unknown-item')
      expect(r.error.name).toBe('NotARealItem')
  })
})
