import { powderMarket } from './powder-name'

export interface GearInput {
  label: string
  name: string
  crafted: boolean
}

export interface CollectInput {
  gear: GearInput[]
  powders: number[] // flattened powder ids across all slots
}

export interface CollectedItem {
  label: string
  name: string
  tier: number | null
  count: number
  tradeable: boolean
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

/** Flatten a build into priceable market entries: gear (1 each) + grouped powders. */
export function collectBuildItems(input: CollectInput): CollectedItem[] {
  const out: CollectedItem[] = []

  for (const g of input.gear)
    out.push({ label: g.label, name: g.name, tier: null, count: 1, tradeable: !g.crafted })

  // Group powders by market name + tier, counting duplicates.
  const grouped = new Map<string, CollectedItem>()
  for (const id of input.powders) {
    const m = powderMarket(id)
    if (!m)
      continue
    const key = `${m.name}|${m.tier}`
    const roman = ROMAN[m.tier] ?? String(m.tier)
    const existing = grouped.get(key)
    if (existing) {
      existing.count++
    }
    else {
      grouped.set(key, { label: `${m.name} ${roman}`, name: m.name, tier: m.tier, count: 1, tradeable: true })
    }
  }
  out.push(...grouped.values())
  return out
}
