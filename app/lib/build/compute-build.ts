// app/lib/build/compute-build.ts
/**
 * Pure build orchestrator — framework-agnostic (NO Vue / NO DOM).
 *
 * Chains the whole combat-math pipeline:
 *   resolveBuildItems → calculateSkillpoints → aggregateBuildStats
 *   → skillpoint overlay → mergeAtree + atree raw stats → collectAtreeSpells
 *   → computeSpellParts → computeMeleeDps → computeDefenseStats
 *
 * Port of builder_graph.js agg chain.
 */

import type { RawBuild } from '../codec/build-codec'
import type { DefenseStats } from '../math/defense'
import type { MeleeDps } from '../math/dps'
import type { StatMap } from '../math/merge-stat'
import type { SkillpointResult } from '../math/skillpoint-calc'
import type { AtreeData } from '../types/atree'
import type { ItemSet } from '../types/item'
import type { RawItemIndex } from './resolve'
import { getSortedClassAtree } from '../atree/build-atree'
import { mergeAtree } from '../atree/merge'
import { collectAtreeRawStats } from '../atree/raw-stats'
import { collectAtreeSpells } from '../atree/spell-collect'
import { WEP_TO_CLASS } from '../codec/wep-to-class'
import { aggregateBuildStats } from '../math/build-stats'
import { SKP_ORDER } from '../math/constants'
import { computeDefenseStats } from '../math/defense'
import { computeMeleeDps } from '../math/dps'
import { mergeStat } from '../math/merge-stat'
import { calculateSkillpoints } from '../math/skillpoint-calc'
import { computeSpellParts } from '../math/spell-calc'
import { resolveBuildItems } from './resolve'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Inputs required by computeBuild beyond the decoded RawBuild. */
export interface BuildContext {
  /** Item resolution index (from buildRawItemIndex). */
  rawItemIndex: RawItemIndex
  /** Item set data (name → ItemSet). Pass an empty Map when no sets are in play. */
  sets: Map<string, ItemSet>
  /** Ability-tree data keyed by class name. */
  atreeData: AtreeData
}

/** Typed result of computeBuild. */
export interface BuildResult {
  /** Fully-merged build stat map (includes skillpoints, atree raw stats, etc.). */
  stats: StatMap
  /** Defensive stats including HP, EHP, elemental defenses. */
  defense: DefenseStats
  /** Melee DPS and per-attack damage. */
  melee: MeleeDps
  /** Full skillpoint calculation result (finalSkillpoints, baseSkillpoints, assignedTotal, activeSetCounts, etc.). */
  skillpoints: SkillpointResult
}

// ---------------------------------------------------------------------------
// computeBuild
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full combat-math pipeline for a decoded RawBuild.
 *
 * Steps (faithful to builder_graph.js agg chain):
 *  1. resolveBuildItems → equipment / weapon / allItems / wynnOrder
 *  2. calculateSkillpoints(wynnOrder, weapon, sets) → activeSetCounts + finalSkillpoints
 *  3. aggregateBuildStats(allItems, weapon, level, activeSetCounts, sets) → stats (editAgg)
 *  4. Skillpoint overlay: stats.set(skp, rawBuild.sp?.[i] ?? finalSkillpoints[i])
 *  5. Atree: mergeAtree → collectAtreeRawStats → merge each into stats via mergeStat
 *  6. collectAtreeSpells(merged, weaponType) → spells; grab melee (baseSpell 0)
 *  7. computeSpellParts(melee, stats, weapon) + computeMeleeDps
 *  8. computeDefenseStats(stats) → defense
 */
export function computeBuild(rawBuild: RawBuild, ctx: BuildContext): BuildResult {
  const { rawItemIndex, sets, atreeData } = ctx

  // Step 1: resolve items
  const { weapon, allItems, wynnOrder } = resolveBuildItems(rawBuild, rawItemIndex)

  // Step 2: skillpoints
  const skp = calculateSkillpoints(wynnOrder, weapon, sets)
  const { activeSetCounts, finalSkillpoints } = skp

  // Step 3: aggregate build stats (classDef is set here from weapon type)
  const stats = aggregateBuildStats(allItems, weapon, rawBuild.level, activeSetCounts, sets)

  // Step 4: skillpoint overlay
  // Use rawBuild.sp[i] when assigned, else computed finalSkillpoints[i]
  for (let i = 0; i < SKP_ORDER.length; i++) {
    const skp = SKP_ORDER[i]!
    stats.set(skp, rawBuild.sp?.[i] ?? finalSkillpoints[i]!)
  }

  // Step 5: atree — resolve class and merge tree
  const weaponType = weapon.get('type') as string
  const cls = WEP_TO_CLASS[weaponType]

  let merged: Map<number, import('../atree/effect-types').MergedAbility>
  if (cls === undefined) {
    // Unknown weapon type — seed default melee only (no class tree)
    merged = mergeAtree([], new Map(), '')
  }
  else {
    const sorted = getSortedClassAtree(atreeData, cls)
    const selection = new Map(rawBuild.activeAtree.map(id => [id, true] as [number, boolean]))
    merged = mergeAtree(sorted, selection, cls)
  }

  // Merge atree raw stats into the build stats (additive, faithfully after editAgg)
  const atreeRaw = collectAtreeRawStats(merged)
  for (const [name, value] of atreeRaw) {
    mergeStat(stats, name, value)
  }

  // Step 6: collect spells
  const effectiveWeaponType = cls !== undefined ? weaponType : 'dagger' // fallback for default spells
  const spells = collectAtreeSpells(merged, weaponType !== '' ? weaponType : effectiveWeaponType)
  const meleeSpell = spells.get(0)

  // Step 7: melee DPS
  let melee: MeleeDps
  if (meleeSpell && meleeSpell.parts.length > 0) {
    const parts = computeSpellParts(meleeSpell, stats, weapon)
    melee = computeMeleeDps(meleeSpell, parts, stats)
  }
  else {
    // No melee spell — produce zero-DPS fallback
    melee = { perAttack: 0, averageDps: 0, attackSpeed: (stats.get('atkSpd') as string) ?? 'NORMAL' }
  }

  // Step 8: defense
  const defense = computeDefenseStats(stats)

  return { stats, defense, melee, skillpoints: skp }
}
