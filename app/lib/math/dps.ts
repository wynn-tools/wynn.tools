import type { StatMap } from './merge-stat'
import type { DamagePartResult } from './spell-calc'
import type { Spell } from './spells'
// app/lib/math/dps.ts
import { ATTACK_SPEEDS, BASE_DAMAGE_MULTIPLIER } from './constants'
import { skillPointsToPercentage } from './skillpoints'

function num(stats: StatMap, key: string): number {
  const v = stats.get(key)
  return typeof v === 'number' ? v : 0
}

/** Critical-hit chance = dex skillpoint percentage. Port of display.js critChance. */
export function critChance(stats: StatMap): number {
  return skillPointsToPercentage(num(stats, 'dex'))
}

/** Crit-weighted average damage of a part. Port of display.js averageDamage. */
export function partAverageDamage(part: DamagePartResult, crit: number): number {
  const nonCritAvg = (part.normalTotal[0] + part.normalTotal[1]) / 2 || 0
  const critAvg = (part.critTotal[0] + part.critTotal[1]) / 2 || 0
  return (1 - crit) * nonCritAvg + crit * critAvg || 0
}

/** atkSpd index shifted by atkTier, clamped to [0, 6]. Port of display.js adjAtkSpd. */
export function adjustedAttackSpeedIndex(stats: StatMap): number {
  let idx = ATTACK_SPEEDS.indexOf(stats.get('atkSpd') as typeof ATTACK_SPEEDS[number]) + num(stats, 'atkTier')
  if (idx > 6)
    idx = 6
  else if (idx < 0)
    idx = 0
  return idx
}

export interface MeleeDps {
  perAttack: number
  averageDps: number
  attackSpeed: string
}

/**
 * Per-attack average + average DPS for a melee spell (base_spell 0).
 * Port of the melee branch of display.js displaySpellDamage.
 */
export function computeMeleeDps(spell: Spell, parts: DamagePartResult[], stats: StatMap): MeleeDps {
  const crit = critChance(stats)
  const headline = parts.find(p => p.name === spell.display) ?? parts[parts.length - 1]!
  const perAttack = partAverageDamage(headline, crit)
  const idx = adjustedAttackSpeedIndex(stats)
  return {
    perAttack,
    averageDps: perAttack * BASE_DAMAGE_MULTIPLIER[idx]!,
    attackSpeed: ATTACK_SPEEDS[idx]!,
  }
}
