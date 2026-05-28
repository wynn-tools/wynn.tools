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
import type { RawMajorIdData } from '../data/cdn-adapter/majid-adapter'
import type { DefenseStats } from '../math/defense'
import type { MeleeDps } from '../math/dps'
import type { StatMap } from '../math/merge-stat'
import type { SkillpointResult } from '../math/skillpoint-calc'
import type { SpellPartResult } from '../math/spell-calc'
import type { Spell } from '../math/spells'
import type { RawAspectData } from '../types/aspect'
import type { AtreeAbility, AtreeData } from '../types/atree'
import type { ItemSet } from '../types/item'
import type { RawItemIndex, RawTomeIndex } from './resolve'
import { getSortedClassAtree } from '../atree/build-atree'
import { mergeAtree } from '../atree/merge'
import { collectAtreeRawStats } from '../atree/raw-stats'
import { collectAtreeSpells } from '../atree/spell-collect'
import { WEP_TO_CLASS } from '../codec/wep-to-class'
import { aggregateBuildStats } from '../math/build-stats'
import { SKP_ORDER } from '../math/constants'
import { computeDefenseStats } from '../math/defense'
import { computeMeleeDps, getSpellCost } from '../math/dps'
import { mergeStat } from '../math/merge-stat'
import { calculateSkillpoints } from '../math/skillpoint-calc'
import { computeSpellParts } from '../math/spell-calc'
import { resolveBuildItems, resolveTomes } from './resolve'

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
  /** Tome resolution index (from buildRawTomeIndex). */
  tomeIndex: RawTomeIndex
  /** Raw aspect data (class name → aspect list). Loaded here; used by M7-2. */
  aspectData: RawAspectData
  /** Major ID ability data (display name → entry). Optional; omit in tests without item major IDs. */
  majorIdData?: RawMajorIdData
}

/** One evaluated spell ready for display. */
export interface SpellOutput {
  spell: Spell
  parts: SpellPartResult[]
  /** Effective mana cost (null for melee which has no cost). */
  cost: number | null
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
  /** All active spells (index 0 = melee, 1-4 = class spells), sorted by baseSpell. */
  spells: SpellOutput[]
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
  const { weapon, allItems: itemsOnly, wynnOrder } = resolveBuildItems(rawBuild, rawItemIndex)

  // Resolve tomes and fold into allItems / wynnOrder
  const { tomes, guildTome } = resolveTomes(rawBuild.tomeIds, ctx.tomeIndex)
  const allItems = [...itemsOnly, ...tomes]
  const wynnOrderWithGuild = [...wynnOrder, guildTome]

  // Step 2: skillpoints (wynnOrder now includes guildTome as 9th entry)
  const skp = calculateSkillpoints(wynnOrderWithGuild, weapon, sets)
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

  // Collect major ID abilities active for this build and class
  const activeMajorIds = (stats.get('activeMajorIDs') as Set<string> | undefined) ?? new Set<string>()
  const majorIdAbilities: AtreeAbility[] = []
  if (ctx.majorIdData) {
    for (const midName of activeMajorIds) {
      const entry = ctx.majorIdData.get(midName)
      if (!entry)
        continue
      for (const abil of entry.abilities) {
        if (abil.class !== cls && abil.class !== 'Any')
          continue
        majorIdAbilities.push({
          id: -1,
          display_name: entry.displayName,
          desc: '',
          parents: [],
          dependencies: [],
          blockers: [],
          cost: 0,
          base_abil: abil.base_abil,
          properties: abil.properties ?? {},
          effects: abil.effects ?? [],
        })
      }
    }
  }

  let merged: Map<number, import('../atree/effect-types').MergedAbility>
  if (cls === undefined) {
    // Unknown weapon type — seed default melee only (no class tree)
    merged = mergeAtree([], new Map(), '', majorIdAbilities)
  }
  else {
    const sorted = getSortedClassAtree(atreeData, cls)
    const selection = new Map(rawBuild.activeAtree.map(id => [id, true] as [number, boolean]))
    merged = mergeAtree(sorted, selection, cls, majorIdAbilities)
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

  // Step 9: evaluate all collected spells for display
  const spellOutputs: SpellOutput[] = []
  for (const [, spell] of [...spells.entries()].sort((a, b) => a[0] - b[0])) {
    if (spell.parts.length === 0)
      continue
    const parts = computeSpellParts(spell, stats, weapon)
    const cost = spell.baseSpell === 0 ? null : getSpellCost(stats, spell)
    spellOutputs.push({ spell, parts, cost })
  }

  return { stats, defense, melee, skillpoints: skp, spells: spellOutputs }
}
