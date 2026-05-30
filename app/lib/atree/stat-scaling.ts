// app/lib/atree/stat-scaling.ts
import type { StatMap } from '../math/merge-stat'
import type { MergedAbility } from './effect-types'
import { mergeStat } from '../math/merge-stat'

/** A scaling input/output target: a build stat or an ability property. */
interface ScalingTarget {
  type: 'stat' | 'prop'
  name: string
  abil?: number
}

/** stat_scaling effect shape (the fields we read off the opaque effect). */
interface StatScalingEffect {
  type: 'stat_scaling'
  slider?: boolean
  positive?: boolean
  round?: boolean
  max?: number | string
  scaling?: Array<number | string>
  inputs?: ScalingTarget[]
  output?: ScalingTarget | ScalingTarget[]
}

/** Port of utils.js round_near — snap to the nearest integer within 1e-8. */
function roundNear(value: number): number {
  const eps = 1e-8
  return Math.abs(value - Math.round(value)) < eps ? Math.round(value) : value
}

/** Port of atree.js atree_translate — resolve `"<id>.<prop>"` refs, pass numbers through. */
function translate(merged: Map<number, MergedAbility>, v: number | string | undefined): number {
  if (typeof v === 'string') {
    const [idStr, prop] = v.split('.')
    const id = Number.parseInt(idStr!, 10)
    return merged.get(id)?.properties[prop!] ?? 0
  }
  return v ?? 0
}

/**
 * Apply always-on (non-slider) `stat_scaling` effects.
 *
 * Port of the non-slider branch of atree.js stat_scaling processing: each effect
 * sums its inputs (read from the pre-scale stat snapshot) times their scaling
 * factors, rounds/clamps/caps the total, then applies it to the output target(s).
 * Stat outputs are returned to be merged into the build stats; prop outputs are
 * written back onto the merged abilities (so spell hit references see them).
 *
 * Slider-driven stat_scaling (Distortion, Tornado Hits, …) is NOT handled here —
 * with no interactive slider its value defaults to 0, which is a no-op, so the
 * baseline matches WynnBuilder with all sliders at rest.
 *
 * Example: Seance (`+1% Spell Damage per 5 Lifesteal, max 50%`) scales `ls` by
 * 0.2 into `sdPct`, capped at 50.
 *
 * @param merged Merged abilities (mutated for `prop` outputs).
 * @param preScaleStats Build stats after items + raw_stat atree bonuses (read-only here).
 * @returns Stat outputs to merge into the build stats.
 */
export function collectAtreeStatScaling(
  merged: Map<number, MergedAbility>,
  preScaleStats: StatMap,
): StatMap {
  const ret: StatMap = new Map()

  function num(stats: StatMap, key: string): number {
    const v = stats.get(key)
    return typeof v === 'number' ? v : 0
  }

  for (const ability of merged.values()) {
    for (const effect of ability.effects) {
      if (effect.type !== 'stat_scaling')
        continue
      const eff = effect as unknown as StatScalingEffect
      if (eff.slider || eff.output === undefined)
        continue

      const scaling = eff.scaling ?? [0]
      const inputs = eff.inputs ?? []
      let total = 0
      for (let i = 0; i < inputs.length; ++i) {
        const input = inputs[i]!
        const factor = translate(merged, scaling[i])
        if (input.type === 'stat') {
          total += num(preScaleStats, input.name) * factor
        }
        else if (input.type === 'prop' && input.abil !== undefined) {
          total += (merged.get(input.abil)?.properties[input.name] ?? 0) * factor
        }
      }

      const round = eff.round ?? true
      const positive = eff.positive ?? true
      if (round)
        total = Math.floor(roundNear(total))
      if (positive && total < 0)
        total = 0
      if (eff.max !== undefined) {
        const max = translate(merged, eff.max)
        if (max > 0 && total > max)
          total = max
        else if (max < 0 && total < max)
          total = max
      }

      const outputs = Array.isArray(eff.output) ? eff.output : [eff.output]
      for (const out of outputs) {
        if (out.type === 'stat') {
          mergeStat(ret, out.name, total)
        }
        else if (out.type === 'prop' && out.abil !== undefined) {
          const target = merged.get(out.abil)
          if (target) {
            const props = target.properties as Record<string, number>
            props[out.name] = (props[out.name] ?? 0) + total
          }
        }
      }
    }
  }

  return ret
}
