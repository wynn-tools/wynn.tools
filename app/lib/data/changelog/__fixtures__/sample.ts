import type { RawChangelog } from '../types'

/** Mixed fixture: items (added/removed/changed incl. partial + cost), one atree class. */
export const SAMPLE_CHANGELOG: RawChangelog = {
  from: 'aaaa1111',
  to: 'bbbb2222',
  items: {
    added: ['Zephyr', 'Anvil'],
    removed: ['Old Blade'],
    changed: {
      'Aberrant\'s Amulet': {
        'identifications.healthRegenRaw.raw': { from: 105, to: 147 },
        'identifications.2ndSpellCost.raw': { from: 10, to: 8 },
        'identifications.walkSpeed.raw': { to: 5 },
        'identifications.thorns.raw': { from: 12 },
      },
    },
  },
  tomes: { added: [], removed: [], changed: {} },
  aspects: null,
  atree: {
    Mage: { added: ['Frozen Tornado'], removed: ['Wind Slash'], changed: {} },
    Archer: { added: [], removed: [], changed: {} },
  },
}

/**
 * Legacy (≈1.17.x–1.18.0) format: added/removed are objects keyed by name →
 * a legacy stat blob, rather than arrays. Names come from the object keys.
 */
export const LEGACY_FORMAT_CHANGELOG: RawChangelog = {
  from: 'cccc3333',
  to: 'dddd4444',
  items: {
    added: {
      'Air Relic Bow': { name: 'Air Relic Bow', level: 50 },
      'Coconut': { name: 'Coconut', level: 45 },
    },
    removed: {
      Lockpick: { name: 'Lockpick', level: 39 },
    },
    changed: {
      Abolition: { 'identifications.lifeSteal.raw': { from: 50, to: 30 } },
    },
  },
  tomes: { added: [], removed: [], changed: {} },
  aspects: null,
  atree: null,
}

/** Null-everything launch transition with a note. */
export const NOTE_ONLY_CHANGELOG: RawChangelog = {
  from: 'pre',
  to: 'launch',
  note: 'Wynn2 launched with a complete item overhaul. No diff data is available for this transition.',
  items: null,
  tomes: null,
  aspects: null,
  atree: null,
}
