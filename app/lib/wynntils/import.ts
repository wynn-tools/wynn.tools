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

interface IdentRange {
  min: number
  max: number
  raw: number
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

/**
 * Get the rolling range for a shorthand id from a CleanedRawItem.
 *
 * Items from the CDN adapter have flat numeric fields (e.g. `item.str = 10`).
 * The test mocks supply an `identifications: Map<string, {min,max,raw}>` directly
 * (as unknown as CleanedRawItem). We check the map path first, then fall back to
 * deriving min/max from expandItem's rolling math on the flat field.
 */
function getIdentRange(item: CleanedRawItem, shorthand: string): IdentRange | null {
  // Test-mock path: item has an explicit identifications Map
  const idents = (item as unknown as Record<string, unknown>).identifications
  if (idents instanceof Map) {
    const entry = idents.get(shorthand) as IdentRange | undefined
    return entry ?? null
  }

  // Real-item path: derive from the flat field via expandItem rolling math
  const expanded = expandItem(item as unknown as Record<string, unknown>)
  const minRolls = expanded.get('minRolls') as Map<string, number>
  const maxRolls = expanded.get('maxRolls') as Map<string, number>
  const min = minRolls?.get(shorthand)
  const max = maxRolls?.get(shorthand)
  if (min === undefined || max === undefined)
    return null
  // If both min and max are 0, this stat isn't present on the item
  if (min === 0 && max === 0)
    return null
  const raw = (item as unknown as Record<string, unknown>)[shorthand] as number ?? 0
  return { min, max, raw }
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
      const range = getIdentRange(item, shorthand)
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
    const result = resolveImport(blocks, ctx, idKeys, occupied)
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
