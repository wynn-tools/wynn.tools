import type { Block } from './decode'
import type { ImportError, ImportRow, ResolvedImport } from './types'
import type { BuildContext } from '~/lib/build/compute-build'
import type { CleanedRawItem } from '~/lib/build/resolve'
import { IDENTIFICATION_MAP } from '~/lib/data/cdn-adapter/key-maps'
import { expandItem } from '~/lib/math/expand-item'
import { parseIdString } from './decode'

const POWDER_TIERS_PER_ELEM = 6

const TYPE_TO_SLOTS: Record<string, number[]> = {
  helmet: [0],
  chestplate: [1],
  leggings: [2],
  boots: [3],
  ring: [4, 5],
  bracelet: [6],
  necklace: [7],
}

export interface IdentRange {
  min: number
  max: number
  raw: number
}

/** Default range lookup for real CleanedRawItems coming from the CDN adapter. */
export function defaultGetIdentRange(item: CleanedRawItem, shorthand: string): IdentRange | null {
  // CleanedRawItem extends Record<string, unknown> in practice; cast bridges the index signature
  const expanded = expandItem(item as Record<string, unknown>)
  const minRolls = expanded.get('minRolls') as Map<string, number> | undefined
  const maxRolls = expanded.get('maxRolls') as Map<string, number> | undefined
  const min = minRolls?.get(shorthand)
  const max = maxRolls?.get(shorthand)
  if (min === undefined || max === undefined)
    return null
  if (min === 0 && max === 0)
    return null
  const raw = (item as Record<string, unknown>)[shorthand] as number ?? 0
  return { min, max, raw }
}

function routeSlot(item: CleanedRawItem, occupied: Set<number>): { slot: number, warning?: string } {
  if (item.category === 'weapon')
    return { slot: 8 }
  const candidates = TYPE_TO_SLOTS[item.type]
  if (!candidates)
    return { slot: -1 }
  for (const s of candidates) {
    if (!occupied.has(s))
      return { slot: s }
  }
  return { slot: candidates[0]!, warning: `All ${item.type} slots filled — overwriting slot ${candidates[0]}.` }
}

function findItemByName(ctx: BuildContext, name: string): CleanedRawItem | null {
  for (const it of ctx.rawItemIndex.byId.values()) {
    if (it.id >= 10000)
      continue
    if (it.displayName === name || it.name === name)
      return it
  }
  return null
}

function percentileToRaw(roll: number, range: IdentRange): number {
  const lo = Math.min(range.min, range.max)
  const hi = Math.max(range.min, range.max)
  const v = Math.round(range.raw * (roll / 100))
  return Math.max(lo, Math.min(hi, v))
}

export function resolveImport(
  blocks: Block[],
  ctx: BuildContext,
  idKeys: Map<number, string>,
  occupied: Set<number>,
  getRange: (item: CleanedRawItem, shorthand: string) => IdentRange | null = defaultGetIdentRange,
): ImportRow {
  const typeBlock = blocks.find(b => b.name === 'TypeData')
  if (!typeBlock || typeBlock.name !== 'TypeData')
    return { ok: false, error: { source: '', message: 'Encoded item has no type block.' } }
  if (typeBlock.itemType !== 0)
    return { ok: false, error: { source: '', message: 'Only gear items are supported in v1.' } }

  const nameBlock = blocks.find(b => b.name === 'NameData')
  const decodedName = (nameBlock && nameBlock.name === 'NameData') ? nameBlock.nameStr : ''
  if (!decodedName)
    return { ok: false, error: { source: '', message: 'Encoded item has no name.' } }

  const item = findItemByName(ctx, decodedName)
  if (!item)
    return { ok: false, error: { source: '', message: `Item '${decodedName}' not found in current data version.` } }

  const route = routeSlot(item, occupied)
  if (route.slot < 0)
    return { ok: false, error: { source: '', message: `Item '${decodedName}' has unsupported type '${item.type}'.` } }

  const warnings: string[] = []
  if (route.warning)
    warnings.push(route.warning)

  const overrides = new Map<string, number>()
  const identBlock = blocks.find(b => b.name === 'IdentificationData')
  if (identBlock && identBlock.name === 'IdentificationData') {
    for (const ent of identBlock.identifications) {
      if (typeof ent.roll !== 'number')
        continue
      const v3 = idKeys.get(ent.kind)
      if (!v3) {
        warnings.push(`Unknown stat id byte ${ent.kind} — skipped.`)
        continue
      }
      const shorthand = IDENTIFICATION_MAP[v3]
      if (!shorthand) {
        warnings.push(`Stat '${v3}' has no wynn.tools mapping — skipped.`)
        continue
      }
      const range = getRange(item, shorthand)
      if (!range) {
        warnings.push(`Item has no '${shorthand}' identification — skipped.`)
        continue
      }
      if (range.min === range.max)
        continue
      overrides.set(shorthand, percentileToRaw(ent.roll, range))
    }
  }

  const powders: number[] = []
  const powderBlock = blocks.find(b => b.name === 'PowderData')
  if (powderBlock && powderBlock.name === 'PowderData') {
    for (const p of powderBlock.powders) {
      if (p.element < 0 || p.element > 4) {
        warnings.push(`Powder with invalid element ${p.element} — dropped.`)
        continue
      }
      powders.push(p.element * POWDER_TIERS_PER_ELEM + (p.tier - 1))
    }
  }

  if (blocks.some(b => b.name === 'RerollData'))
    warnings.push('Reroll count ignored (not tracked).')
  if (blocks.some(b => b.name === 'ShinyData'))
    warnings.push('Shiny stat ignored (not tracked).')

  const row: ResolvedImport = {
    slot: route.slot,
    itemId: item.id,
    overrides,
    powders,
    warnings,
    decodedName,
  }
  return { ok: true, row }
}

export interface BatchResult {
  applied: ResolvedImport[]
  errors: ImportError[]
}

export function parseAndResolveAll(
  text: string,
  ctx: BuildContext,
  idKeys: Map<number, string>,
  parseFn: (line: string) => Block[] = parseIdString,
  getRange: (item: CleanedRawItem, shorthand: string) => IdentRange | null = defaultGetIdentRange,
): BatchResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const applied: ResolvedImport[] = []
  const errors: ImportError[] = []
  const occupied = new Set<number>()
  for (const line of lines) {
    let blocks: Block[]
    try {
      blocks = parseFn(line)
    }
    catch (e) {
      errors.push({ source: line, message: `Invalid Wynntils item string: ${(e as Error).message}` })
      continue
    }
    const result = resolveImport(blocks, ctx, idKeys, occupied, getRange)
    if (result.ok) {
      applied.push(result.row)
      occupied.add(result.row.slot)
    }
    else {
      errors.push({ ...result.error, source: line })
    }
  }
  return { applied, errors }
}
