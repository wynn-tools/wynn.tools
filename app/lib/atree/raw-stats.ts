// app/lib/atree/raw-stats.ts
import type { StatMap } from '../math/merge-stat'
import type { MergedAbility, RawStatEffect } from './effect-types'
import { mergeStat } from '../math/merge-stat'

/**
 * Collect all always-on raw_stat effects from merged abilities into a stat map.
 * Port of atree.js atree_raw_stats (toggled effects are handled later in 5f-3).
 */
export function collectAtreeRawStats(merged: Map<number, MergedAbility>): StatMap {
  const ret: StatMap = new Map()
  for (const ability of merged.values()) {
    for (const effect of ability.effects) {
      if (effect.type !== 'raw_stat')
        continue
      const raw = effect as RawStatEffect
      if (raw.toggle)
        continue
      for (const bonus of raw.bonuses) {
        if (bonus.type === 'stat')
          mergeStat(ret, bonus.name, bonus.value)
      }
    }
  }
  return ret
}
