import type { Block } from './decode'
import type { IdentRange } from './roll-percent'
import type { BuildContext } from '~/lib/build/compute-build'
import type { CleanedRawItem } from '~/lib/build/resolve'
import { IDENTIFICATION_MAP } from '~/lib/data/cdn-adapter/key-maps'
import { defaultGetIdentRange } from './import'
import { overallRollPercent, rollPercent } from './roll-percent'

const POWDER_TIERS_PER_ELEM = 6

export interface InspectorIdRow {
  shorthand: string
  actual: number
  range: IdentRange
  rollPct: number | null
}

export interface InspectorShiny {
  shinyId: number
  val: number
}

export interface InspectorView {
  item: CleanedRawItem
  decodedName: string
  identified: boolean
  identifications: InspectorIdRow[]
  overall: number | null
  powders: number[]
  shiny: InspectorShiny | null
  rerollCount: number
  warnings: string[]
}

export type AnalyzeError
  = | { kind: 'no-type-block' }
    | { kind: 'unsupported-type', itemType: number }
    | { kind: 'no-name' }
    | { kind: 'unknown-item', name: string }

export type AnalyzeResult
  = | { ok: true, view: InspectorView }
    | { ok: false, error: AnalyzeError }

function findItemByName(ctx: BuildContext, name: string): CleanedRawItem | null {
  for (const it of ctx.rawItemIndex.byId.values()) {
    if ((it.id as number) >= 10000)
      continue
    if (it.displayName === name || it.name === name)
      return it
  }
  return null
}

export function analyzeItem(
  blocks: Block[],
  ctx: BuildContext,
  idKeys: Map<number, string>,
  getRange: (item: CleanedRawItem, shorthand: string) => IdentRange | null = defaultGetIdentRange,
): AnalyzeResult {
  const typeBlock = blocks.find(b => b.name === 'TypeData')
  if (!typeBlock || typeBlock.name !== 'TypeData')
    return { ok: false, error: { kind: 'no-type-block' } }
  if (typeBlock.itemType !== 0)
    return { ok: false, error: { kind: 'unsupported-type', itemType: typeBlock.itemType } }

  const nameBlock = blocks.find(b => b.name === 'NameData')
  const decodedName = (nameBlock && nameBlock.name === 'NameData') ? nameBlock.nameStr : ''
  if (!decodedName)
    return { ok: false, error: { kind: 'no-name' } }

  const item = findItemByName(ctx, decodedName)
  if (!item)
    return { ok: false, error: { kind: 'unknown-item', name: decodedName } }

  const warnings: string[] = []
  const identifications: InspectorIdRow[] = []

  const identBlock = blocks.find(b => b.name === 'IdentificationData')
  const identified = !!(identBlock && identBlock.name === 'IdentificationData' && identBlock.identifications.length > 0)
  if (identified && identBlock && identBlock.name === 'IdentificationData') {
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
        warnings.push(`No range for '${shorthand}' on item '${item.name}' — skipped.`)
        continue
      }
      const lo = Math.min(range.min, range.max)
      const hi = Math.max(range.min, range.max)
      const actual = Math.max(lo, Math.min(hi, Math.round(range.raw * (ent.roll / 100))))
      identifications.push({
        shorthand,
        actual,
        range,
        rollPct: rollPercent(actual, range),
      })
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

  const shinyBlock = blocks.find(b => b.name === 'ShinyData')
  const shiny = (shinyBlock && shinyBlock.name === 'ShinyData')
    ? { shinyId: shinyBlock.shinyId, val: shinyBlock.val }
    : null

  const rerollBlock = blocks.find(b => b.name === 'RerollData')
  const rerollCount = (rerollBlock && rerollBlock.name === 'RerollData') ? rerollBlock.rerollCount : 0

  return {
    ok: true,
    view: {
      item,
      decodedName,
      identified,
      identifications,
      overall: overallRollPercent(identifications.map(r => r.rollPct)),
      powders,
      shiny,
      rerollCount,
      warnings,
    },
  }
}
