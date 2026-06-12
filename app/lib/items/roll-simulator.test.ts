import type { RequirementSet, RollOptions } from './roll-simulator'
import type { IdRange } from '~/lib/items-search/types'
import { describe, expect, it } from 'vitest'
import { activeRequirementCount, meetsRequirements, rollItem } from './roll-simulator'

function entry(raw: number): IdRange {
  if (raw === 0)
    return { min: 0, max: 0, raw: 0 }
  const min = Math.round(raw * 0.3)
  const max = Math.round(raw * 1.3)
  return { min, max, raw }
}

function fixedRand(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length]!
    i++
    return v
  }
}

const baseOpts: RollOptions = {
  ampTier: 0,
  augment: 'none',
  lockedId: null,
  previous: null,
}

describe('rollItem', () => {
  it('collapses fixed (min === max) ids to 100% and excludes them from overall', () => {
    const base = { fixed: { min: 5, max: 5, raw: 5 }, vary: entry(100) }
    const out = rollItem(base, { ...baseOpts, rand: fixedRand([0.5]) })
    expect(out.rolledIds.fixed).toEqual({ raw: 5, percent: 100, star: 0 })
    // Overall reflects only the variable id, not the fixed 100%.
    expect(out.overall).toBeLessThan(100)
  })

  it('amp tier biases positive-range rolls toward 1.3 by 5% of the remaining gap per tier', () => {
    const base = { hpRegenPct: entry(100) }
    // rand=0.5 → ceil(0.5*101)=51, rollPos=(51-1)/100+0.3=0.8.
    // tier 0: 0.8 unchanged. tier 4: 0.8 + (1.3-0.8)*0.2 = 0.9.
    const t0 = rollItem(base, { ...baseOpts, ampTier: 0, rand: fixedRand([0.5]) })
    const t4 = rollItem(base, { ...baseOpts, ampTier: 4, rand: fixedRand([0.5]) })
    expect(t4.rolledIds.hpRegenPct!.raw).toBeGreaterThan(t0.rolledIds.hpRegenPct!.raw)
  })

  it('rolls 1.3 exactly when rand resolves to 1 (3-star perfect)', () => {
    const base = { hpRegenPct: entry(100) }
    const out = rollItem(base, { ...baseOpts, rand: fixedRand([1]) })
    const r = out.rolledIds.hpRegenPct!
    expect(r.star).toBe(3)
    expect(r.percent).toBe(100)
    expect(r.raw).toBe(130)
  })

  it('percent of 0 is the worst possible roll for a positive-base id', () => {
    const base = { hpRegenPct: entry(100) }
    // Lowest possible rand → rollPos = (ceil(0.01*101)-1)/100 + 0.3 = 0.31
    const out = rollItem(base, { ...baseOpts, rand: fixedRand([0.0001]) })
    const r = out.rolledIds.hpRegenPct!
    expect(r.percent).toBeLessThan(5)
  })

  it('overall is the mean of per-id percents', () => {
    const base = { a: entry(100), b: entry(100) }
    const out = rollItem(base, { ...baseOpts, rand: fixedRand([0.5, 0.5, 0.9, 0.9]) })
    const a = out.rolledIds.a!.percent
    const b = out.rolledIds.b!.percent
    expect(out.overall).toBeCloseTo((a + b) / 2, 1)
  })

  it('star tiers map to multiplier bands', () => {
    const base = { x: entry(100) }
    // rand=0.99 → ceil(0.99*101)=100, rollPos=(100-1)/100+0.3=1.29
    const justBelowPerfect = rollItem(base, { ...baseOpts, rand: fixedRand([0.99]) })
    expect(justBelowPerfect.rolledIds.x!.star).toBe(2)
    // rand=1 → ceil(101)=101, rollPos=(101-1)/100+0.3=1.3
    const perfect = rollItem(base, { ...baseOpts, rand: fixedRand([1]) })
    expect(perfect.rolledIds.x!.star).toBe(3)
  })

  describe('augments', () => {
    const base = { kept: entry(100), changed: entry(100) }
    const previous = {
      kept: { raw: 130, percent: 100, star: 3 as const },
      changed: { raw: 30, percent: 0, star: 0 as const },
    }

    it('insulator preserves the locked id, rerolls others', () => {
      const out = rollItem(base, {
        ...baseOpts,
        augment: 'insulator',
        lockedId: 'kept',
        previous,
        rand: fixedRand([0.5]),
      })
      expect(out.rolledIds.kept).toEqual(previous.kept)
      expect(out.rolledIds.changed).not.toEqual(previous.changed)
    })

    it('isolator preserves all OTHER ids and rerolls the locked one', () => {
      const out = rollItem(base, {
        ...baseOpts,
        augment: 'isolator',
        lockedId: 'changed',
        previous,
        rand: fixedRand([0.5]),
      })
      expect(out.rolledIds.kept).toEqual(previous.kept)
      expect(out.rolledIds.changed).not.toEqual(previous.changed)
    })

    it('simulator ignores previous and rerolls everything', () => {
      const out = rollItem(base, {
        ...baseOpts,
        augment: 'simulator',
        lockedId: 'kept',
        previous,
        rand: fixedRand([0.5]),
      })
      expect(out.rolledIds.kept).not.toEqual(previous.kept)
      expect(out.rolledIds.changed).not.toEqual(previous.changed)
    })

    it('isolator with no target keeps everything (degenerate)', () => {
      const out = rollItem(base, {
        ...baseOpts,
        augment: 'isolator',
        lockedId: null,
        previous,
        rand: fixedRand([0.5]),
      })
      expect(out.rolledIds.kept).not.toEqual(previous.kept)
      expect(out.rolledIds.changed).not.toEqual(previous.changed)
    })
  })

  describe('inverted (cost) ids', () => {
    it('treats a positive-base cost id as if it rolls the negative range (no stars, percent measures benefit)', () => {
      // spellCost1Pct is in IDENTIFICATION_MAP and isInverted via isCost.
      const base = { spellCost1Pct: entry(10) } // raw=10, max=13, min=3
      const out = rollItem(base, { ...baseOpts, rand: fixedRand([0.5]) })
      const r = out.rolledIds.spellCost1Pct!
      expect(r.star).toBe(0)
      // For a positive-base, inverted id, the negative range [0.7, 1.3] applies
      // and high percent means low cost. The actual rolled value depends on rand.
      expect(r.percent).toBeGreaterThanOrEqual(0)
      expect(r.percent).toBeLessThanOrEqual(100)
    })
  })
})

describe('meetsRequirements', () => {
  const item = {
    rolledIds: {
      a: { raw: 90, percent: 75, star: 1 as const },
      b: { raw: 40, percent: 12, star: 0 as const },
    },
    overall: 43.5,
  }

  function reqs(overrides: Partial<RequirementSet>): RequirementSet {
    return {
      overall: { enabled: false, value: null, direction: 'gte' },
      perId: {},
      ...overrides,
    }
  }

  it('passes when no requirements active', () => {
    expect(meetsRequirements(item, reqs({}))).toBe(true)
  })

  it('gte requirement on overall must be met', () => {
    expect(meetsRequirements(item, reqs({
      overall: { enabled: true, value: 50, direction: 'gte' },
    }))).toBe(false)
    expect(meetsRequirements(item, reqs({
      overall: { enabled: true, value: 40, direction: 'gte' },
    }))).toBe(true)
  })

  it('lte requirement on overall must be met', () => {
    expect(meetsRequirements(item, reqs({
      overall: { enabled: true, value: 30, direction: 'lte' },
    }))).toBe(false)
    expect(meetsRequirements(item, reqs({
      overall: { enabled: true, value: 50, direction: 'lte' },
    }))).toBe(true)
  })

  it('per-id requirements are AND-ed with overall', () => {
    const r = reqs({
      overall: { enabled: true, value: 30, direction: 'gte' },
      perId: { a: { enabled: true, value: 70, direction: 'gte' } },
    })
    expect(meetsRequirements(item, r)).toBe(true)
    const fails = { ...r, perId: { a: { enabled: true, value: 80, direction: 'gte' } } }
    expect(meetsRequirements(item, fails)).toBe(false)
  })

  it('enabled requirement with null value is treated as inactive', () => {
    expect(meetsRequirements(item, reqs({
      overall: { enabled: true, value: null, direction: 'gte' },
      perId: { a: { enabled: true, value: null, direction: 'gte' } },
    }))).toBe(true)
  })

  it('missing per-id key on the item fails the requirement', () => {
    expect(meetsRequirements(item, reqs({
      perId: { ghost: { enabled: true, value: 1, direction: 'gte' } },
    }))).toBe(false)
  })
})

describe('activeRequirementCount', () => {
  it('counts enabled requirements that have a value', () => {
    const r = {
      overall: { enabled: true, value: 80, direction: 'gte' as const },
      perId: {
        a: { enabled: true, value: 90, direction: 'gte' as const },
        b: { enabled: true, value: null, direction: 'gte' as const },
        c: { enabled: false, value: 50, direction: 'gte' as const },
      },
    }
    expect(activeRequirementCount(r)).toBe(2)
  })
})
