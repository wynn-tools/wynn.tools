// app/lib/math/mana-sustain.ts
//
// Mana sustain over a spell cycle, ported from wynnmana.github.io's base model
// (radiance / masks / transcendence variants omitted). Pure and UI-free.
//
// Model:
//   gain/s  = (manaRegen + 25) / 5 + manaSteal / 3
//             (base regen 25 over the 5s regen tick; mana steal over its 3s tick)
//   A spell is a 3-input combo, so spells/s = cps / 3.
//   Casting the same spell back-to-back ramps its cost by +5 each repeat, so a
//   sustainable estimate needs a cycle with at least two distinct spells.
//   usage/s = (cps / 3) * meanRampedCycleCost
//   net/s   = gain/s − usage/s

export interface ManaSustainInput {
  /** Mana Regen stat (per 5s). */
  manaRegen: number
  /** Mana Steal stat (per 3s). */
  manaSteal: number
  /** Clicks per second. */
  cps: number
  /** Spell cycle as base-spell indices (1..4), in cast order. */
  cycle: number[]
  /** Effective per-cast cost by base-spell index (1..4). */
  spellCosts: Record<number, number>
}

export interface ManaSustainResult {
  gainPerSec: number
  usagePerSec: number
  netPerSec: number
  /** False when the cycle has fewer than two distinct spells (usage not modelled). */
  hasVariedCycle: boolean
}

/** Base regen mana over the 5-second regen tick, matching the wynnmana model. */
export const BASE_MANA_REGEN = 25

function manaGainPerSec(manaRegen: number, manaSteal: number): number {
  return (manaRegen + BASE_MANA_REGEN) / 5 + manaSteal / 3
}

/**
 * Per-cast costs across the cycle with the consecutive-repeat ramp (+5 each time
 * the same spell is cast back-to-back), rotated so the cycle's wrap-around repeat
 * is counted. Mirrors wynnmana's calculateMana cost loop. Each cost floors at 1.
 */
function rampedCycleCosts(cycle: number[], cost: (spell: number) => number): number[] {
  const seq = cycle.slice()
  // Rotate so the first and last entries differ, making the wrap unambiguous.
  let guard = 0
  while (seq.length > 1 && seq[0] === seq[seq.length - 1] && guard++ < seq.length) {
    seq.unshift(seq.pop()!)
  }

  const out: number[] = []
  for (let i = 0; i < Math.min(2, seq.length); i++)
    out.push(Math.max(1, cost(seq[i]!)))

  let repeat = 0
  for (let i = 2; i < seq.length; i++) {
    if (seq[i - 1] === seq[i - 2]) {
      repeat++
      out.push(Math.max(1, cost(seq[i]!) + repeat * 5))
    }
    else {
      repeat = 0
      out.push(Math.max(1, cost(seq[i]!)))
    }
  }

  if (seq.length >= 2 && seq[seq.length - 1] === seq[seq.length - 2]) {
    repeat++
    const wrapped = cost(seq[0]!) + repeat * 5
    if (wrapped > 1)
      out[0] = (out[0] ?? 0) + repeat * 5
  }

  return out
}

export function computeManaSustain(input: ManaSustainInput): ManaSustainResult {
  const { manaRegen, manaSteal, cps, cycle, spellCosts } = input
  const gainPerSec = manaGainPerSec(manaRegen, manaSteal)

  const distinct = new Set(cycle).size
  if (cycle.length < 2 || distinct < 2) {
    return { gainPerSec, usagePerSec: 0, netPerSec: gainPerSec, hasVariedCycle: false }
  }

  const costs = rampedCycleCosts(cycle, s => spellCosts[s] ?? 0)
  const meanCost = costs.reduce((a, b) => a + b, 0) / costs.length
  const usagePerSec = (cps / 3) * meanCost

  return {
    gainPerSec,
    usagePerSec,
    netPerSec: gainPerSec - usagePerSec,
    hasVariedCycle: true,
  }
}

/** Parse a cycle string ("1234", "1-3-1") into base-spell indices 1..4. */
export function parseCycle(raw: string): number[] {
  const out: number[] = []
  for (const ch of raw) {
    const n = Number.parseInt(ch, 10)
    if (n >= 1 && n <= 4)
      out.push(n)
  }
  return out
}
