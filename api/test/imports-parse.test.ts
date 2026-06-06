import { describe, expect, it } from 'vitest'
import { normalizeImportEntry } from '../src/scripts/imports/build-db/parse'

describe('normalizeImportEntry', () => {
  it('normalizes tags via the curated library and drops class/subclass slugs', () => {
    const out = normalizeImportEntry('BuildA', {
      tag: 'mage, riftwalker, raids, dps, ws',
      link: 'https://example/#XYZ',
      class: 'Mage',
    })
    expect(out?.tags).toEqual(['raid', 'dps', 'walk-speed'])
  })

  it('preserves name, hash, class, credits', () => {
    const out = normalizeImportEntry('Cool Build', {
      tag: 'dps',
      link: 'https://example/#HASHHERE',
      credit: 'alice, bob',
      class: 'Warrior',
    })
    expect(out).toMatchObject({
      name: 'Cool Build',
      buildString: 'HASHHERE',
      playerClass: 'Warrior',
      primaryCredit: 'alice',
      secondaryCredits: ['bob'],
      source: 'build-db',
    })
  })

  it('defaults missing credit to "generic build"', () => {
    const out = normalizeImportEntry('X', {
      tag: 'dps',
      link: 'https://example/#H',
      class: 'Mage',
    })
    expect(out?.primaryCredit).toBe('generic build')
  })

  it('returns null when link has no hash', () => {
    expect(normalizeImportEntry('X', { tag: 'dps', link: 'https://example/no-hash', class: 'Mage' })).toBeNull()
  })
})
