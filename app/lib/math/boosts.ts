// app/lib/math/boosts.ts
/**
 * Active Boosts — temporary combat buffs ported from WynnBuilder's
 * boosts_node / radiance_node / armor_powder_node (js/builder/builder_graph.js).
 * Pure: no Vue, no DOM.
 */
import type { StatMap } from './merge-stat'
import { SKP_ELEMENTS, SKP_ORDER } from './constants'
import { mergeStat } from './merge-stat'
import { REVERSED_IDS } from './roll-constants'

export type BoostId
  = | 'radiance' | 'divinehonor' | 'shine'
    | 'warscream' | 'emboldeningcry' | 'vengeful' | 'fortitude'
    | 'fanatic' | 'lunatic' | 'judgement'

export interface BuildBoosts {
  toggles: Set<BoostId>
  /** Per-element manual damage % [e, t, w, f, a]. */
  elemDmg: [number, number, number, number, number]
}

/** All valid toggle ids, in display order. */
export const BOOST_IDS: readonly BoostId[] = [
  'radiance',
  'divinehonor',
  'shine',
  'judgement',
  'warscream',
  'emboldeningcry',
  'vengeful',
  'fortitude',
  'fanatic',
  'lunatic',
]

/** Per-element slider caps [e, t, w, f, a] (WynnBuilder powders.js cap arg). */
export const BOOST_ELEM_CAPS: readonly [number, number, number, number, number] = [300, 200, 120, 120, 120]

/**
 * Stats scaled by Radiance (WynnBuilder radiance_affected). HP intentionally
 * excluded, matching the reference.
 */
const RADIANCE_AFFECTED: readonly string[] = [
  'fDef',
  'wDef',
  'aDef',
  'tDef',
  'eDef',
  'hprPct',
  'mr',
  'sdPct',
  'mdPct',
  'ls',
  'ms',
  'healPct',
  'kb',
  'weakenEnemy',
  'slowEnemy',
  'rDefPct',
]

export function emptyBoosts(): BuildBoosts {
  return { toggles: new Set(), elemDmg: [0, 0, 0, 0, 0] }
}

export function boostsAreEmpty(b: BuildBoosts): boolean {
  return b.toggles.size === 0 && b.elemDmg.every(v => v === 0)
}

/** Radiance scale: additive bonuses, or exactly 1.4 when judgement is active. */
export function radianceMultiplier(b: BuildBoosts): number {
  if (b.toggles.has('judgement'))
    return 1.4
  let m = 1
  if (b.toggles.has('radiance'))
    m += 0.15
  if (b.toggles.has('divinehonor'))
    m += 0.05
  if (b.toggles.has('shine'))
    m += 0.05
  return m
}

/**
 * Scale Radiance-affected stats and item-granted skillpoints in place.
 * Mirrors radiance_node; runs before atree raw stats are merged.
 */
export function applyRadiance(stats: StatMap, totalItemSkillpoints: number[], b: BuildBoosts): void {
  const mult = radianceMultiplier(b)
  if (mult === 1)
    return
  for (const id of RADIANCE_AFFECTED) {
    const cur = (stats.get(id) as number) ?? 0
    const reversed = REVERSED_IDS.includes(id)
    if (reversed ? cur < 0 : cur > 0)
      stats.set(id, Math.floor(cur * mult))
  }
  for (let i = 0; i < SKP_ORDER.length; i++) {
    const item = totalItemSkillpoints[i] ?? 0
    if (item > 0) {
      const skp = SKP_ORDER[i]!
      const cur = (stats.get(skp) as number) ?? 0
      stats.set(skp, Math.floor(cur + item * (mult - 1)))
    }
  }
}

/**
 * Merge toggle + element multipliers into the build stats in place.
 * Mirrors boosts_node + armor_powder_node; runs after atree raw stats.
 */
export function applyBoostMultipliers(stats: StatMap, b: BuildBoosts): void {
  const t = b.toggles

  // Damage Potion: max of active damage-boost candidates.
  let damagePotion = 0
  if (t.has('vengeful'))
    damagePotion = Math.max(damagePotion, 20)
  if (t.has('fortitude'))
    damagePotion = Math.max(damagePotion, 40)
  if (damagePotion > 0)
    mergeStat(stats, 'damMult.Potion', damagePotion)

  // Defense Potion: sum of warscream + emboldening (single merge to preserve sum).
  let defPotion = 0
  if (t.has('warscream'))
    defPotion += 20
  if (t.has('emboldeningcry'))
    defPotion += 5
  if (defPotion > 0)
    mergeStat(stats, 'defMult.Potion', defPotion)

  if (t.has('emboldeningcry'))
    mergeStat(stats, 'damMult.Strength', 8)
  if (t.has('fanatic'))
    mergeStat(stats, 'damMult.Vulnerability', 15)
  if (t.has('lunatic'))
    mergeStat(stats, 'defMult.AbilityWeaken', 15)
  if (t.has('judgement')) {
    mergeStat(stats, 'damMult.Judgement', 20)
    mergeStat(stats, 'defMult.Judgement', 20)
  }

  for (let i = 0; i < SKP_ELEMENTS.length; i++) {
    const v = b.elemDmg[i] ?? 0
    if (v !== 0)
      mergeStat(stats, `${SKP_ELEMENTS[i]}DamPct`, v)
  }
}

// --- URL query (de)serialization ----------------------------------------

export function serializeBoosts(b: BuildBoosts): { boosts: string | null, edmg: string | null } {
  const toggles = BOOST_IDS.filter(id => b.toggles.has(id))
  const hasElem = b.elemDmg.some(v => v !== 0)
  return {
    boosts: toggles.length ? toggles.join(',') : null,
    edmg: hasElem ? b.elemDmg.join(',') : null,
  }
}

export function deserializeBoosts(boostsParam: string | null, edmgParam: string | null): BuildBoosts {
  const out = emptyBoosts()
  if (boostsParam) {
    for (const raw of boostsParam.split(',')) {
      const id = raw.trim() as BoostId
      if (BOOST_IDS.includes(id))
        out.toggles.add(id)
    }
  }
  if (edmgParam) {
    const parts = edmgParam.split(',')
    for (let i = 0; i < 5; i++) {
      const n = Number.parseFloat(parts[i] ?? '0')
      out.elemDmg[i] = Number.isFinite(n) ? n : 0
    }
  }
  return out
}
