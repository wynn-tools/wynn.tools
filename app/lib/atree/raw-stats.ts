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

/**
 * Apply always-on raw_stat `prop` bonuses from merged abilities back onto the
 * ability properties in `merged`. Mirrors WynnBuilder's atree_scaling step
 * which runs apply_bonus(type='prop') before spell collection.
 *
 * This makes ability properties (e.g. Aura's num_totems, boosted by Double Totem)
 * reflect the fully-upgraded values that atree_translate later reads.
 */
export function applyAtreePropBonuses(merged: Map<number, MergedAbility>): void {
  for (const ability of merged.values()) {
    for (const effect of ability.effects) {
      if (effect.type !== 'raw_stat')
        continue
      const raw = effect as RawStatEffect
      if (raw.toggle)
        continue
      for (const bonus of raw.bonuses) {
        if (bonus.type !== 'prop' || bonus.abil === undefined)
          continue
        const target = merged.get(bonus.abil as number)
        if (!target)
          continue
        const props = target.properties as Record<string, number>
        const name = bonus.name
        if (name in props)
          props[name]! += bonus.value
        else
          props[name] = bonus.value
      }
    }
  }
}
