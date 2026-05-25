import type { StatMap, StatValue } from './merge-stat'
import { SKP_ELEMENTS } from './constants'
import { rawToPct, rawToPctUncapped } from './raw-to-pct'
import { SKILLPOINT_FINAL_MULT, skillPointsToPercentage } from './skillpoints'

export interface DefenseStats {
  totalHp: number
  ehp: { withAgi: number, withoutAgi: number }
  totalHpr: number
  ehpr: { withAgi: number, withoutAgi: number }
  /** def skillpoint percentage × 100 (matches source). */
  defPct: number
  /** agi skillpoint percentage × 100. */
  agiPct: number
  /** [earth, thunder, water, fire, air] defenses. */
  elementalDefenses: number[]
}

function n(stats: StatMap, key: string): number {
  const v = stats.get(key)
  return typeof v === 'number' ? v : 0
}

/** Compute defensive stats / EHP. Port of builder_graph.js getDefenseStats. */
export function computeDefenseStats(stats: StatMap): DefenseStats {
  const defPct = skillPointsToPercentage(n(stats, 'def')) * SKILLPOINT_FINAL_MULT[3]!
  const agiPct = skillPointsToPercentage(n(stats, 'agi')) * SKILLPOINT_FINAL_MULT[4]!

  let totalHp = n(stats, 'hp') + n(stats, 'hpBonus')
  if (totalHp < 5)
    totalHp = 5

  let defMult = 2 - n(stats, 'classDef')
  const defMultMap = stats.get('defMult')
  if (defMultMap instanceof Map) {
    for (const v of (defMultMap as Map<string, StatValue>).values()) {
      if (typeof v === 'number')
        defMult *= 1 - v / 100
    }
  }
  const agiReduction = (100 - n(stats, 'agiDef')) / 100

  const ehpWithAgi = totalHp / (agiReduction * agiPct + (1 - agiPct) * (1 - defPct)) / defMult
  const ehpWithoutAgi = totalHp / ((1 - defPct) * defMult)

  const totalHpr = rawToPct(n(stats, 'hprRaw'), n(stats, 'hprPct') / 100)
  const ehprWithAgi = totalHpr / (agiReduction * agiPct + (1 - agiPct) * (1 - defPct)) / defMult
  const ehprWithoutAgi = totalHpr / ((1 - defPct) * defMult)

  const rDefPct = n(stats, 'rDefPct')
  const elementalDefenses = SKP_ELEMENTS.map(el =>
    rawToPctUncapped(n(stats, `${el}Def`), (n(stats, `${el}DefPct`) + rDefPct) / 100),
  )

  return {
    totalHp,
    ehp: { withAgi: ehpWithAgi, withoutAgi: ehpWithoutAgi },
    totalHpr,
    ehpr: { withAgi: ehprWithAgi, withoutAgi: ehprWithoutAgi },
    defPct: defPct * 100,
    agiPct: agiPct * 100,
    elementalDefenses,
  }
}
