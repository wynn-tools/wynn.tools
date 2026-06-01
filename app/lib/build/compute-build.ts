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
import type { BuildBoosts } from '../math/boosts'
import type { DefenseStats } from '../math/defense'
import type { MeleeDps } from '../math/dps'
import type { StatMap } from '../math/merge-stat'
import type { PowderActive } from '../math/powder-specials'
import type { SkillpointResult } from '../math/skillpoint-calc'
import type { SpWarning } from '../math/sp-warning'
import type { SpellPartResult } from '../math/spell-calc'
import type { Spell } from '../math/spells'
import type { RawAspectData } from '../types/aspect'
import type { AtreeAbility, AtreeData } from '../types/atree'
import type { ItemSet } from '../types/item'
import type { RawItemIndex, RawTomeIndex } from './resolve'
import type { RollContext } from './roll-context'
import { getSortedClassAtree } from '../atree/build-atree'
import { mergeAtree } from '../atree/merge'
import { applyAtreePropBonuses, collectAtreeRawStats } from '../atree/raw-stats'
import { collectAtreeSpells } from '../atree/spell-collect'
import { collectAtreeStatScaling } from '../atree/stat-scaling'
import { WEP_TO_CLASS } from '../codec/wep-to-class'
import { applyBoostMultipliers, applyRadiance } from '../math/boosts'
import { aggregateBuildStats } from '../math/build-stats'
import { SKP_ORDER } from '../math/constants'
import { computeDefenseStats } from '../math/defense'
import { computeMeleeDps, getSpellCost } from '../math/dps'
import { mergeStat } from '../math/merge-stat'
import { applyPowderSpecialBoosts, collectPowderSpecialAttacks } from '../math/powder-specials'
import { calculateSkillpoints } from '../math/skillpoint-calc'
import { levelToSkillPoints } from '../math/skillpoints'
import { computeSpWarning } from '../math/sp-warning'
import { computeSpellParts } from '../math/spell-calc'
import { resolveBuildItems, resolveTomes } from './resolve'
import { DEFAULT_ROLL_CONTEXT } from './roll-context'

export type { RollContext, RollPreset } from './roll-context'

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
  /**
   * Craft context (recipes + ingredients) required to resolve crafted slots.
   * Optional — builds with no crafted slots don't need it. Throws inside
   * `resolveBuildItems` if a crafted slot is encountered without one.
   */
  craftContext?: import('../crafter/types').CraftContext
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
  /** Skill-point feasibility classification (drives the SP warning box). */
  spWarning: SpWarning
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
export function computeBuild(rawBuild: RawBuild, ctx: BuildContext, boosts?: BuildBoosts, powderActive?: PowderActive, rollContext: RollContext = DEFAULT_ROLL_CONTEXT): BuildResult {
  const { rawItemIndex, sets, atreeData } = ctx

  // Step 1: resolve items
  const { weapon, allItems: itemsOnly, wynnOrder } = resolveBuildItems(rawBuild, rawItemIndex, ctx.craftContext, rollContext)

  // Resolve tomes and fold into allItems / wynnOrder
  const { tomes, guildTome } = resolveTomes(rawBuild.tomeIds, ctx.tomeIndex, rollContext)
  const allItems = [...itemsOnly, ...tomes]
  const wynnOrderWithGuild = [...wynnOrder, guildTome]

  // Step 2: skillpoints (wynnOrder now includes guildTome as 9th entry)
  const skp = calculateSkillpoints(wynnOrderWithGuild, weapon, sets)
  const { activeSetCounts, finalSkillpoints } = skp

  // Skill-point feasibility (drives the SP warning box). The guild tome is the
  // only tome that contributes skill points, so we only pay for a second
  // "without it" pass when the equipped guild tome actually supplies points and
  // the build is otherwise wearable — i.e. exactly when a tome dependency is
  // possible. Infeasible builds are classified from the primary pass alone.
  const available = levelToSkillPoints(rawBuild.level)
  const guildSp = (guildTome.get('skillpoints') as number[] | undefined) ?? [0, 0, 0, 0, 0]
  const guildSuppliesSp = guildSp.some(v => v > 0)
  const feasibleAsEquipped
    = skp.assignedTotal <= available && skp.baseSkillpoints.every(v => v <= 100)
  const skpNoGuild = guildSuppliesSp && feasibleAsEquipped
    ? calculateSkillpoints(wynnOrder, weapon, sets)
    : null
  const spWarning = computeSpWarning(skp, skpNoGuild, available, guildSp)

  // Step 3: aggregate build stats (classDef is set here from weapon type)
  const stats = aggregateBuildStats(allItems, weapon, rawBuild.level, activeSetCounts, sets)

  // Step 4: skillpoint overlay
  // Use rawBuild.sp[i] when assigned, else computed finalSkillpoints[i]
  for (let i = 0; i < SKP_ORDER.length; i++) {
    const skp = SKP_ORDER[i]!
    stats.set(skp, rawBuild.sp?.[i] ?? finalSkillpoints[i]!)
  }

  // Radiance scaling (boosts): scales item stats + item skillpoints before the
  // ability tree merges in. Faithful to WynnBuilder's pre_scale_agg → radiance_node.
  if (boosts)
    applyRadiance(stats, skp.totalItemSkillpoints, boosts)

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

  // Collect aspect tier abilities active for this build's class. Each selected
  // aspect contributes its chosen tier's abilities (e.g. +num_orbs), merged like
  // atree nodes via base_abil. Mirrors WynnBuilder's atree aspect loop.
  const aspectAbilities: AtreeAbility[] = []
  if (cls !== undefined && ctx.aspectData) {
    const classAspects = ctx.aspectData[cls]
    if (classAspects) {
      const activeNodes = new Set(rawBuild.activeAtree)
      const aspectById = new Map(classAspects.map(a => [a.id, a]))
      for (const slot of rawBuild.aspects) {
        if (slot === null)
          continue
        const [id, tier] = slot
        const aspect = aspectById.get(id)
        const tierEntry = aspect?.tiers[tier - 1]
        if (!aspect || !tierEntry?.abilities)
          continue
        for (const abil of tierEntry.abilities) {
          // Dependency gate: every referenced node must be actively selected.
          if (abil.dependencies && !abil.dependencies.every(d => activeNodes.has(d)))
            continue
          aspectAbilities.push({
            id: -1,
            display_name: aspect.displayName,
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
  }

  const extraAbilities = [...majorIdAbilities, ...aspectAbilities]

  let merged: Map<number, import('../atree/effect-types').MergedAbility>
  if (cls === undefined) {
    // Unknown weapon type — seed default melee only (no class tree)
    merged = mergeAtree([], new Map(), '', extraAbilities)
  }
  else {
    const sorted = getSortedClassAtree(atreeData, cls)
    const selection = new Map(rawBuild.activeAtree.map(id => [id, true] as [number, boolean]))
    merged = mergeAtree(sorted, selection, cls, extraAbilities)
  }

  // Merge atree raw stats into the build stats (additive, faithfully after editAgg)
  const atreeRaw = collectAtreeRawStats(merged)
  for (const [name, value] of atreeRaw) {
    mergeStat(stats, name, value)
  }

  // Apply raw_stat prop bonuses back onto ability properties (mirrors atree_scaling in WynnBuilder).
  // This makes property references like "9.num_totems" in spell hits resolve to the upgraded value.
  applyAtreePropBonuses(merged)

  // Apply always-on stat_scaling effects (e.g. Seance: lifesteal → +Spell Damage %).
  // Reads the post-raw_stat stats as WynnBuilder's pre-scale snapshot, then folds
  // the stat outputs in. Runs before spell collection so prop outputs are visible.
  const atreeScaled = collectAtreeStatScaling(merged, stats)
  for (const [name, value] of atreeScaled)
    mergeStat(stats, name, value)

  // Toggle + element-slider multipliers (boosts): merged after atree raw stats,
  // before spells see the stat map. Faithful to WynnBuilder's boosts_node.
  if (boosts)
    applyBoostMultipliers(stats, boosts)

  // Powder special damage-boosts (Curse/Courage/Wind Prison) → damMult.{name},
  // merged alongside the other multipliers before spell collection.
  if (powderActive)
    applyPowderSpecialBoosts(stats, powderActive)

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

  // Powder special direct-damage attacks (Quake/Chain Lightning/Courage) → own lines.
  if (powderActive) {
    for (const atk of collectPowderSpecialAttacks(powderActive, stats, weapon)) {
      if (atk.parts.length > 0)
        spellOutputs.push({ spell: atk.spell, parts: atk.parts, cost: null })
    }
  }

  return { stats, defense, melee, skillpoints: skp, spells: spellOutputs, spWarning }
}
