import type { MarketMode } from './summarize'
import type { RawMarketPrice } from './types'
import { pickId, pickUnid } from './summarize'

export interface BuildCostEntry {
  label: string // slot or display label, for the breakdown UI
  name: string
  tier: number | null
  count: number
  tradeable: boolean
  price: RawMarketPrice | null
}

export interface BuildCostLine {
  label: string
  name: string
  count: number
  tradeable: boolean
  identified: number | null
  unidentified: number | null
}

export interface BuildCost {
  identifiedTotal: number
  unidentifiedTotal: number
  pricedCount: number
  tradeableCount: number
  lines: BuildCostLine[]
}

export function buildCost(entries: BuildCostEntry[], mode: MarketMode = 'avg'): BuildCost {
  let identifiedTotal = 0
  let unidentifiedTotal = 0
  let pricedCount = 0
  let tradeableCount = 0
  const lines: BuildCostLine[] = []

  for (const e of entries) {
    if (e.tradeable)
      tradeableCount++
    const id = e.tradeable && e.price ? pickId(e.price, mode) : null
    const unid = e.tradeable && e.price ? pickUnid(e.price, mode) : null
    if (e.tradeable && id != null) {
      pricedCount++
      identifiedTotal += id * e.count
      unidentifiedTotal += (unid ?? id) * e.count
    }
    lines.push({ label: e.label, name: e.name, count: e.count, tradeable: e.tradeable, identified: id, unidentified: unid })
  }

  return { identifiedTotal, unidentifiedTotal, pricedCount, tradeableCount, lines }
}
