import { describe, expect, it } from 'vitest'
import { BUILD_TAGS, DENY_TAGS, normalizeTags, TAG_LIMITS, tagAxis, tagDisplayLabel } from './build-tags'

describe('normalizeTags', () => {
  it('drops denylisted class/subclass slugs', () => {
    expect(normalizeTags(['mage', 'dps'])).toEqual(['dps'])
    expect(normalizeTags(['Riftwalker', 'tank'])).toEqual(['tank'])
  })

  it('resolves aliases (ws→walk-speed, raids→raid, mana steal→manasteal)', () => {
    expect(normalizeTags(['ws'])).toEqual(['walk-speed'])
    expect(normalizeTags(['raids'])).toEqual(['raid'])
    expect(normalizeTags(['mana steal'])).toEqual(['manasteal'])
    expect(normalizeTags(['life steal'])).toEqual(['lifesteal'])
  })

  it('combines normalisation per spec example', () => {
    expect(normalizeTags(['Mage', 'DPS', 'raids', 'mana steal', 'ws', 'mage']))
      .toEqual(['dps', 'raid', 'manasteal', 'walk-speed'])
  })

  it('passes custom tags through', () => {
    expect(normalizeTags(['custom-thing'])).toEqual(['custom-thing'])
  })

  it('collapses whitespace and casing', () => {
    expect(normalizeTags(['  Walk Speed  '])).toEqual(['walk-speed'])
  })

  it('caps at MAX_PER_BUILD (8)', () => {
    const input = Array.from({ length: 12 }, (_, i) => `custom-${i}`)
    expect(normalizeTags(input)).toHaveLength(TAG_LIMITS.MAX_PER_BUILD)
  })

  it('drops over-long tags (>24 chars)', () => {
    const long = 'x'.repeat(25)
    expect(normalizeTags([long, 'dps'])).toEqual(['dps'])
  })

  it('dedupes', () => {
    expect(normalizeTags(['dps', 'dps', 'tank'])).toEqual(['dps', 'tank'])
  })

  it('ignores non-strings and empty values', () => {
    expect(normalizeTags(['dps', '', '   ', undefined as unknown as string, null as unknown as string])).toEqual(['dps'])
  })
})

describe('tagDisplayLabel', () => {
  it('returns curated label for known slugs', () => {
    expect(tagDisplayLabel('manasteal')).toBe('Mana Steal')
    expect(tagDisplayLabel('walk-speed')).toBe('Walk Speed')
    expect(tagDisplayLabel('raid')).toBe('Raids')
  })

  it('falls back to slug for unknown', () => {
    expect(tagDisplayLabel('xyz')).toBe('xyz')
  })
})

describe('tagAxis', () => {
  it('returns axis for curated tags', () => {
    expect(tagAxis('dps')).toBe('role')
    expect(tagAxis('manasteal')).toBe('playstyle')
    expect(tagAxis('raid')).toBe('content')
    expect(tagAxis('budget')).toBe('budget')
    expect(tagAxis('silly')).toBe('misc')
  })

  it('returns null for unknown slug', () => {
    expect(tagAxis('xyz')).toBeNull()
  })
})

describe('bUILD_TAGS + DENY_TAGS', () => {
  it('every curated tag has an axis from the union', () => {
    const axes = new Set(['role', 'playstyle', 'content', 'budget', 'misc'])
    for (const def of Object.values(BUILD_TAGS)) expect(axes.has(def.axis)).toBe(true)
  })

  it('denylist contains classes and subclasses', () => {
    expect(DENY_TAGS.has('mage')).toBe(true)
    expect(DENY_TAGS.has('riftwalker')).toBe(true)
    expect(DENY_TAGS.has('shadestepper')).toBe(true)
  })
})
