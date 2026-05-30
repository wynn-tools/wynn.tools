// app/lib/math/powder-specials.ts
/**
 * Powder specials — per-element weapon (active) and armor (passive) powder
 * specials, ported from WynnBuilder's powders.js `powderSpecialStats` and
 * builder_graph.js `PowderSpecialCalcNode`. Pure: no Vue, no DOM.
 *
 * Element order is e, t, w, f, a (Earth, Thunder, Water, Fire, Air).
 */
import type { StatMap } from './merge-stat'
import type { DamagePartResult, SpellPartResult } from './spell-calc'
import type { Spell } from './spells'
import { mergeStat } from './merge-stat'
import { computeSpellParts } from './spell-calc'

export interface PowderSpecial {
  /** Weapon (active) special name, e.g. 'Quake'. */
  weaponName: string
  /** Armor (passive) special name, e.g. 'Rage'. */
  passiveName: string
  /** Passive armor damage-% slider cap. */
  cap: number
  /** Direct-damage % per tier (Quake/Chain Lightning/Courage). Absent for boost-only specials. */
  damage?: number[]
  /** Damage-boost % per tier (Curse/Courage/Wind Prison). Absent for damage-only specials. */
  damageBoost?: number[]
}

/** Per-element powder specials, index 0..4 = e,t,w,f,a. */
export const POWDER_SPECIALS: readonly PowderSpecial[] = [
  {
    weaponName: 'Quake',
    passiveName: 'Rage',
    cap: 300,
    damage: [240, 280, 320, 360, 400, 440, 480],
  },
  {
    weaponName: 'Chain Lightning',
    passiveName: 'Kill Streak',
    cap: 200,
    damage: [200, 225, 250, 275, 300, 325, 350],
  },
  {
    weaponName: 'Curse',
    passiveName: 'Concentration',
    cap: 120,
    damageBoost: [10, 12.5, 15, 17.5, 20, 22.5, 25],
  },
  {
    weaponName: 'Courage',
    passiveName: 'Endurance',
    cap: 120,
    damage: [110, 125, 140, 155, 170, 185, 200],
    damageBoost: [10, 12.5, 15, 17.5, 20, 22.5, 25],
  },
  {
    weaponName: 'Wind Prison',
    passiveName: 'Dodge',
    cap: 120,
    damageBoost: [100, 125, 150, 175, 200, 225, 250],
  },
]

/** Active-tier selection per element [e,t,w,f,a]; each 0 (Off) or 1..7. */
export type PowderActive = [number, number, number, number, number]

export function emptyPowderActive(): PowderActive {
  return [0, 0, 0, 0, 0]
}

export function powderActiveIsEmpty(active: PowderActive): boolean {
  return active.every(t => t === 0)
}

/**
 * Apply damage-boost powder specials to the stat map in place. Mirrors
 * WynnBuilder's PowderSpecialCalcNode: only Curse / Courage / Wind Prison
 * contribute `damMult.{name}` at the selected tier. Quake / Chain Lightning are
 * direct-damage only (handled by collectPowderSpecialAttacks, Task 4).
 */
export function applyPowderSpecialBoosts(
  stats: StatMap,
  active: PowderActive,
): void {
  for (let i = 0; i < POWDER_SPECIALS.length; i++) {
    const tier = active[i] ?? 0
    if (tier < 1)
      continue
    const ps = POWDER_SPECIALS[i]!
    if (ps.damageBoost)
      mergeStat(stats, `damMult.${ps.weaponName}`, ps.damageBoost[tier - 1]!)
  }
}

/** One-line raw-effect readout for an element's special at a tier (1..7), '' at tier 0. */
export function tierReadout(elementIndex: number, tier: number): string {
  if (tier < 1)
    return ''
  const ps = POWDER_SPECIALS[elementIndex]
  if (!ps)
    return ''
  if (ps.damage && ps.weaponName === 'Quake')
    return `${ps.damage[tier - 1]}% area damage`
  if (ps.damage && ps.damageBoost)
    return `${ps.damage[tier - 1]}% damage · +${ps.damageBoost[tier - 1]}% boost`
  if (ps.damage)
    return `${ps.damage[tier - 1]}% damage`
  if (ps.damageBoost)
    return `+${ps.damageBoost[tier - 1]}% damage`
  return ''
}

// --- URL query (de)serialization (param `psa`) ---------------------------

export function serializePowderActive(active: PowderActive): string | null {
  return powderActiveIsEmpty(active) ? null : active.join('.')
}

export function deserializePowderActive(param: string | null): PowderActive {
  const out = emptyPowderActive()
  if (param) {
    const parts = param.split('.')
    for (let i = 0; i < 5; i++) {
      const n = Number.parseInt(parts[i] ?? '0', 10)
      out[i] = Number.isFinite(n) ? Math.min(7, Math.max(0, n)) : 0
    }
  }
  return out
}

// --- Direct-damage active attacks (Phase 2) ------------------------------

/** [e,t,w,f,a] → conversion-multiplier index (index 0 is neutral). */
const ELEMENT_CONV_INDEX = [1, 2, 3, 4, 5]

export interface PowderSpecialAttack {
  spell: Spell
  parts: SpellPartResult[]
}

/** Per-element damage fields scaled in place when dividing out a self-boost. */
const SCALABLE_KEYS = [
  'normalMin',
  'normalMax',
  'normalTotal',
  'critMin',
  'critMax',
  'critTotal',
] as const

/**
 * Build one synthetic attack per active direct-damage special (Quake / Chain
 * Lightning / Courage). Mirrors WynnBuilder displayPowderSpecials: the special's
 * Damage% becomes an elemental conversion; Courage's own damage-boost is divided
 * back out so it doesn't self-apply.
 */
export function collectPowderSpecialAttacks(
  active: PowderActive,
  stats: StatMap,
  weapon: Map<string, unknown>,
): PowderSpecialAttack[] {
  const out: PowderSpecialAttack[] = []
  for (let i = 0; i < POWDER_SPECIALS.length; i++) {
    const tier = active[i] ?? 0
    const ps = POWDER_SPECIALS[i]!
    if (tier < 1 || !ps.damage)
      continue
    const multipliers = [0, 0, 0, 0, 0, 0]
    multipliers[ELEMENT_CONV_INDEX[i]!] = ps.damage[tier - 1]!
    const spell: Spell = {
      name: `${ps.weaponName} (Powder Special)`,
      baseSpell: 0,
      parts: [{ name: ps.weaponName, multipliers }],
    }
    const parts = computeSpellParts(spell, stats, weapon)
    // Courage carries its own damage-boost in damMult.Courage (applied to all
    // damage by applyPowderSpecialBoosts); divide it back out so the special's
    // own damage doesn't double-count the boost. Faithful to displayPowderSpecials.
    if (ps.damageBoost) {
      const factor = 1 + ps.damageBoost[tier - 1]! / 100
      for (const part of parts) {
        if (part.type !== 'damage')
          continue
        const dmg = part as DamagePartResult
        for (const key of SCALABLE_KEYS) {
          const arr = dmg[key] as number[]
          for (let j = 0; j < arr.length; j++)
            arr[j]! /= factor
        }
      }
    }
    out.push({ spell, parts })
  }
  return out
}
