import type { IdRange } from '~/lib/items-search/types'
import { isInverted } from '~/lib/data/identifications'

export type Augment = 'none' | 'insulator' | 'isolator' | 'simulator'
export type Comparator = 'gte' | 'lte'

export interface RolledId {
  raw: number
  percent: number
  star: 0 | 1 | 2 | 3
}

export interface RolledItem {
  rolledIds: Record<string, RolledId>
  overall: number
}

export interface RollOptions {
  ampTier: number
  augment: Augment
  lockedId: string | null
  previous: Record<string, RolledId> | null
  rand?: () => number
}

export interface Requirement {
  enabled: boolean
  value: number | null
  direction: Comparator
}

export interface RequirementSet {
  overall: Requirement
  perId: Record<string, Requirement>
}

/**
 * Wynncraft identification roll model.
 *
 * Each id rolls on [0.3, 1.3] when its base is positive (good direction), or
 * [0.7, 1.3] when the base is negative or the id is inverted (cost-style). The
 * resulting integer value is `Math.round(base * roll)`. Percentile is the
 * position of the rolled value within the legal [min, max] range, 0–100, where
 * 100 is always "best for the player." An amplifier of tier N biases each
 * positive-range roll toward 1.3 by `0.05 * N` of the remaining distance.
 *
 * Star tiers come from the actual roll multiplier on the positive direction:
 *   1★ ≥ 1.0   2★ ≥ 1.25   3★ = 1.3
 */
export function rollItem(
  base: Record<string, IdRange>,
  opts: RollOptions,
): RolledItem {
  const rand = opts.rand ?? Math.random
  const ampMul = 0.05 * Math.max(0, Math.min(4, opts.ampTier))
  const out: Record<string, RolledId> = {}
  let sum = 0
  let count = 0

  for (const [key, entry] of Object.entries(base)) {
    if (entry.min === entry.max) {
      out[key] = { raw: entry.raw, percent: 100, star: 0 }
      continue
    }
    if (shouldKeepPrevious(key, opts)) {
      const prev = opts.previous![key]!
      out[key] = prev
      sum += prev.percent
      count++
      continue
    }
    const rolled = rollOne(key, entry, ampMul, rand)
    out[key] = rolled
    sum += rolled.percent
    count++
  }

  return {
    rolledIds: out,
    overall: count > 0 ? round1(sum / count) : 0,
  }
}

function shouldKeepPrevious(key: string, opts: RollOptions): boolean {
  if (!opts.previous || !opts.previous[key])
    return false
  if (opts.augment === 'simulator')
    return false
  if (opts.augment === 'insulator')
    return opts.lockedId === key
  if (opts.augment === 'isolator')
    return opts.lockedId !== null && opts.lockedId !== key
  return false
}

function rollOne(key: string, entry: IdRange, ampMul: number, rand: () => number): RolledId {
  const positiveBase = entry.raw > 0
  const inverted = isInverted(key)
  // The positive-range roll [0.3, 1.3] applies when the player benefits from a
  // larger multiplier: a positive-base id that isn't inverted, or a negative-
  // base id that IS inverted (cost-style negative becomes a benefit when low).
  const positiveRange = positiveBase !== inverted

  const mul = positiveRange
    ? amped(rand, ampMul)
    : randInNegativeRange(rand)

  const value = Math.round(entry.raw * mul)
  const span = entry.max - entry.min
  const percent = span === 0
    ? 100
    : positiveBase
      ? clampPct(((value - entry.min) / span) * 100)
      : clampPct(((entry.max - value) / span) * 100)

  const star = positiveRange ? starOf(mul) : 0
  return { raw: value, percent: round1(percent), star }
}

function amped(rand: () => number, ampMul: number): number {
  const base = randInPositiveRange(rand)
  return round2(base + (1.3 - base) * ampMul)
}

function randInPositiveRange(rand: () => number): number {
  return (Math.ceil(rand() * 101) - 1) / 100 + 0.3
}
function randInNegativeRange(rand: () => number): number {
  return (Math.ceil(rand() * 61) - 1) / 100 + 0.7
}

function starOf(mul: number): 0 | 1 | 2 | 3 {
  if (mul >= 1.3)
    return 3
  if (mul >= 1.25)
    return 2
  if (mul >= 1.0)
    return 1
  return 0
}

function clampPct(p: number): number {
  return Math.max(0, Math.min(100, p))
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * True iff every enabled requirement is satisfied. An enabled requirement with
 * a null value is treated as inactive (waiting for input).
 */
export function meetsRequirements(item: RolledItem, reqs: RequirementSet): boolean {
  if (reqs.overall.enabled && reqs.overall.value != null) {
    if (!compare(item.overall, reqs.overall.value, reqs.overall.direction))
      return false
  }
  for (const [key, req] of Object.entries(reqs.perId)) {
    if (!req.enabled || req.value == null)
      continue
    const rolled = item.rolledIds[key]
    if (!rolled)
      return false
    if (!compare(rolled.percent, req.value, req.direction))
      return false
  }
  return true
}

function compare(actual: number, target: number, direction: Comparator): boolean {
  return direction === 'gte' ? actual >= target : actual <= target
}

export function activeRequirementCount(reqs: RequirementSet): number {
  let n = reqs.overall.enabled && reqs.overall.value != null ? 1 : 0
  for (const r of Object.values(reqs.perId)) {
    if (r.enabled && r.value != null)
      n++
  }
  return n
}
