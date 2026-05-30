// app/lib/math/stat-summary.ts
/**
 * Build the secondary-stat ledger shown beside a build (mana, sustain, damage,
 * cost, utility) in Summary and Detailed views.
 *
 * Pure — no Vue, no DOM. Mirrors WynnBuilder's display.js stat summary: same row
 * order, same derived figures (mana "with base", per-hit, effective lifesteal),
 * so migrating users see matching numbers. Only non-zero rows surface; the core
 * defence block and Total Mana always show.
 */
import type { BuildResult } from '../build/compute-build'
import type { StatMap } from './merge-stat'
import { BASE_DAMAGE_MULTIPLIER } from './constants'
import { adjustedAttackSpeedIndex } from './dps'
import { skillPointsToPercentage } from './skillpoints'

/** A single ledger line. `element` (0=neutral..5=air) tints the leading glyph. */
export interface StatLine {
  label: string
  value: string
  element?: number
  /** Indented derived row (`➜ …`). */
  sub?: boolean
}

/** A divider-separated section of the ledger. */
export interface StatGroup {
  id: string
  lines: StatLine[]
}

/** Damage-key element prefixes mapped to the glyph palette index (0=neutral). */
const ELEMENTS: Array<{ prefix: string, name: string, index: number }> = [
  { prefix: 'n', name: 'Neutral', index: 0 },
  { prefix: 'e', name: 'Earth', index: 1 },
  { prefix: 't', name: 'Thunder', index: 2 },
  { prefix: 'w', name: 'Water', index: 3 },
  { prefix: 'f', name: 'Fire', index: 4 },
  { prefix: 'a', name: 'Air', index: 5 },
]

const ELEM_DEF_NAMES = ['Earth', 'Thunder', 'Water', 'Fire', 'Air']
const ORDINALS = ['1st', '2nd', '3rd', '4th']

function num(stats: StatMap, key: string): number {
  const v = stats.get(key)
  return typeof v === 'number' ? v : 0
}

function f2(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function int(n: number): string {
  return Math.round(n).toLocaleString()
}

/**
 * Compute the grouped stat ledger for one view.
 *
 * @param result The computed build.
 * @param mode `'summary'` for the curated subset, `'detailed'` for everything.
 */
export function buildStatSummary(result: BuildResult, mode: 'summary' | 'detailed'): StatGroup[] {
  const { stats, defense: d } = result
  const detailed = mode === 'detailed'
  const groups: StatGroup[] = []

  function group(id: string, build: (push: (line: StatLine, opts?: { summary?: boolean, when?: boolean }) => void) => void): void {
    const lines: StatLine[] = []
    build((line, opts = {}) => {
      const summaryOnly = opts.summary ?? false
      const when = opts.when ?? true
      if (!when)
        return
      if (!detailed && !summaryOnly)
        return
      lines.push(line)
    })
    if (lines.length)
      groups.push({ id, lines })
  }

  // -- Defence (core rows always present) --------------------------------------
  group('defence', (push) => {
    push({ label: 'Total HP', value: f2(d.totalHp) }, { summary: true })
    push({ label: 'Effective HP', value: f2(d.ehp.withAgi) }, { summary: true })
    push({ label: 'Effective HP (no agi)', value: f2(d.ehp.withoutAgi) }, { summary: true })
    push({ label: 'HP Regen (Final)', value: f2(d.totalHpr) }, { summary: true })
    push({ label: 'Effective HP Regen', value: f2(d.ehpr.withAgi), sub: true })
    for (let i = 0; i < 5; i++)
      push({ label: `${ELEM_DEF_NAMES[i]} Def`, value: f2(d.elementalDefenses[i] ?? 0), element: i + 1 }, { summary: true })
  })

  // -- Sustain -----------------------------------------------------------------
  const idx = adjustedAttackSpeedIndex(stats)
  const speedDiv = 3 * (BASE_DAMAGE_MULTIPLIER[idx] ?? 1)
  const mr = num(stats, 'mr')
  const ms = num(stats, 'ms')
  const ls = num(stats, 'ls')
  const intPct = skillPointsToPercentage(num(stats, 'int'))
  const totalMana = 100 + num(stats, 'maxMana') + Math.floor(intPct * 100)

  group('sustain', (push) => {
    push({ label: 'Mana Regen', value: `${int(mr)}/5s` }, { summary: true, when: mr !== 0 })
    push({ label: '➜ Total with base', value: `${int(mr + 25)}/5s`, sub: true }, { summary: true, when: mr !== 0 })
    push({ label: 'Mana Steal', value: `${int(ms)}/3s` }, { summary: true, when: ms !== 0 })
    push({ label: '➜ Mana per hit', value: `${Math.round((ms / speedDiv) * 10) / 10}`, sub: true }, { summary: true, when: ms !== 0 })
    push({ label: 'Total Mana', value: int(totalMana) }, { summary: true })
    push({ label: 'Raw Health Regen', value: int(num(stats, 'hprRaw')) }, { when: num(stats, 'hprRaw') !== 0 })
    push({ label: 'Health Regen %', value: `${int(num(stats, 'hprPct'))}%` }, { when: num(stats, 'hprPct') !== 0 })
    push({ label: 'Heal Effectiveness %', value: `${int(num(stats, 'healPct'))}%` }, { when: num(stats, 'healPct') !== 0 })
    push({ label: 'Life Steal', value: `${int(ls)}/3s` }, { summary: true, when: ls !== 0 })
    push({ label: '➜ Effective LS', value: `${int(Math.round((d.ehp.withAgi * ls) / d.totalHp))}/3s`, sub: true }, { summary: true, when: ls !== 0 })
    push({ label: '➜ Life per hit', value: int(ls / speedDiv), sub: true }, { summary: true, when: ls !== 0 })
  })

  // -- Damage & elemental defence (detailed only) ------------------------------
  group('damage', (push) => {
    push({ label: 'Spell Damage %', value: `${int(num(stats, 'sdPct'))}%` }, { when: num(stats, 'sdPct') !== 0 })
    push({ label: 'Spell Damage Raw', value: int(num(stats, 'sdRaw')) }, { when: num(stats, 'sdRaw') !== 0 })
    push({ label: 'Melee Damage %', value: `${int(num(stats, 'mdPct'))}%` }, { when: num(stats, 'mdPct') !== 0 })
    push({ label: 'Melee Damage Raw', value: int(num(stats, 'mdRaw')) }, { when: num(stats, 'mdRaw') !== 0 })
    for (const el of ELEMENTS)
      push({ label: `${el.name} Spell Damage Raw`, value: int(num(stats, `${el.prefix}SdRaw`)), element: el.index }, { when: num(stats, `${el.prefix}SdRaw`) !== 0 })
    for (const el of ELEMENTS)
      push({ label: `${el.name} Damage Raw`, value: int(num(stats, `${el.prefix}DamRaw`)), element: el.index }, { when: num(stats, `${el.prefix}DamRaw`) !== 0 })
    for (const el of ELEMENTS)
      push({ label: `${el.name} Damage %`, value: `${int(num(stats, `${el.prefix}DamPct`))}%`, element: el.index }, { when: num(stats, `${el.prefix}DamPct`) !== 0 })
    for (const el of ELEMENTS.slice(1))
      push({ label: `${el.name} Defense %`, value: `${int(num(stats, `${el.prefix}DefPct`))}%`, element: el.index }, { when: num(stats, `${el.prefix}DefPct`) !== 0 })
  })

  // -- Spell cost & reflection (detailed only) ---------------------------------
  group('cost', (push) => {
    for (let s = 1; s <= 4; s++) {
      push({ label: `${ORDINALS[s - 1]} Spell Cost %`, value: `${int(num(stats, `spPct${s}`))}%` }, { when: num(stats, `spPct${s}`) !== 0 })
      push({ label: `${ORDINALS[s - 1]} Spell Cost Raw`, value: int(num(stats, `spRaw${s}`)) }, { when: num(stats, `spRaw${s}`) !== 0 })
    }
    push({ label: 'Reflection', value: `${int(num(stats, 'ref'))}%` }, { when: num(stats, 'ref') !== 0 })
  })

  // -- Utility -----------------------------------------------------------------
  group('utility', (push) => {
    push({ label: 'Exploding', value: `${int(num(stats, 'expd'))}%` }, { summary: true, when: num(stats, 'expd') !== 0 })
    push({ label: 'Walk Speed Bonus', value: `${int(num(stats, 'spd'))}%` }, { summary: true, when: num(stats, 'spd') !== 0 })
    push({ label: 'Sprint Bonus', value: `${int(num(stats, 'sprint'))}%` }, { when: num(stats, 'sprint') !== 0 })
    push({ label: 'Sprint Regen', value: `${int(num(stats, 'sprintReg'))}%` }, { when: num(stats, 'sprintReg') !== 0 })
    push({ label: 'Jump Height', value: int(num(stats, 'jh')) }, { summary: true, when: num(stats, 'jh') !== 0 })
    push({ label: 'Poison', value: `${int(num(stats, 'poison'))}/3s` }, { when: num(stats, 'poison') !== 0 })
    push({ label: 'Combat XP Bonus', value: `${int(num(stats, 'xpb'))}%` }, { summary: true, when: num(stats, 'xpb') !== 0 })
    push({ label: 'Loot Bonus', value: `${int(num(stats, 'lb'))}%` }, { summary: true, when: num(stats, 'lb') !== 0 })
  })

  return groups
}
