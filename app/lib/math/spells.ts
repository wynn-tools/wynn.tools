// app/lib/math/spells.ts

/** A damage spell part: applies elemental multipliers via calculateSpellDamage. */
export interface SpellDamagePart {
  name: string
  multipliers: number[] // length 6 (n,e,t,w,f,a), percentages
  useStr?: boolean // default true
  ignoredMults?: string[]
  display?: boolean // default true
}

/** A "total" spell part: combines named earlier parts, each scaled by a hit count. */
export interface SpellTotalPart {
  name: string
  hits: Record<string, number>
  display?: boolean // default true
}

export type SpellPart = SpellDamagePart | SpellTotalPart

export interface Spell {
  name: string
  baseSpell: number // 0 = melee, 1-4 = the four class spells
  scaling?: 'melee' | 'spell' // default 'spell'
  useAtkspd?: boolean // default true
  display?: string // name of the part to surface as the spell's headline (default 'total')
  parts: SpellPart[]
}

export function isDamagePart(part: SpellPart): part is SpellDamagePart {
  return 'multipliers' in part
}
export function isTotalPart(part: SpellPart): part is SpellTotalPart {
  return 'hits' in part
}

/** Per-weapon-class default melee spell. Port of damage_calc.js default_spells. */
export const DEFAULT_SPELLS = new Map<string, Spell>([
  ['wand', {
    name: 'Wand Melee',
    baseSpell: 0,
    scaling: 'melee',
    useAtkspd: false,
    display: 'Melee',
    parts: [{ name: 'Melee', multipliers: [100, 0, 0, 0, 0, 0] }],
  }],
  ['spear', {
    name: 'Melee',
    baseSpell: 0,
    scaling: 'melee',
    useAtkspd: false,
    display: 'Melee',
    parts: [{ name: 'Melee', multipliers: [100, 0, 0, 0, 0, 0] }],
  }],
  ['bow', {
    name: 'Bow Shot',
    baseSpell: 0,
    scaling: 'melee',
    useAtkspd: false,
    display: 'Single Shot',
    parts: [{ name: 'Single Shot', multipliers: [100, 0, 0, 0, 0, 0] }],
  }],
  ['dagger', {
    name: 'Melee',
    baseSpell: 0,
    scaling: 'melee',
    useAtkspd: false,
    display: 'Melee',
    parts: [{ name: 'Melee', multipliers: [100, 0, 0, 0, 0, 0] }],
  }],
  ['relik', {
    name: 'Relik Melee',
    baseSpell: 0,
    scaling: 'melee',
    useAtkspd: false,
    display: 'Total',
    parts: [
      { name: 'Single Beam', multipliers: [33, 0, 0, 0, 0, 0] },
      { name: 'Total', hits: { 'Single Beam': 3 } },
    ],
  }],
])
