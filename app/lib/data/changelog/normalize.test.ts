import { describe, expect, it } from 'vitest'
import { NOTE_ONLY_CHANGELOG, SAMPLE_CHANGELOG } from './__fixtures__/sample'
import { filterChangelogView, normalizeChangelog } from './normalize'

describe('normalizeChangelog', () => {
  const view = normalizeChangelog(SAMPLE_CHANGELOG)

  it('culls empty categories to null', () => {
    expect(view.tomes).toBeNull()
    expect(view.aspects).toBeNull()
  })

  it('sorts added names case-insensitively', () => {
    expect(view.items!.added).toEqual(['Anvil', 'Zephyr'])
  })

  it('groups atree per class, dropping empty classes', () => {
    expect(view.atree!.map(g => g.className)).toEqual(['Mage'])
    expect(view.atree![0].section.added).toEqual(['Frozen Tornado'])
  })

  it('computes field direction and good with cost inversion', () => {
    const fields = view.items!.changed[0].fields
    const byLabel = Object.fromEntries(fields.map(f => [f.label, f]))
    // healthRegenRaw 105 -> 147: up, good
    expect(byLabel['Health Regen Raw']).toMatchObject({
      from: 105,
      to: 147,
      direction: 'up',
      good: true,
    })
    // 2ndSpellCost 10 -> 8: down, but cost so good
    expect(byLabel['2nd Spell Cost']).toMatchObject({
      from: 10,
      to: 8,
      direction: 'down',
      good: true,
    })
  })

  it('handles partial deltas (added / removed field)', () => {
    const byLabel = Object.fromEntries(
      view.items!.changed[0].fields.map(f => [f.label, f]),
    )
    expect(byLabel['Walk Speed']).toMatchObject({
      from: null,
      to: 5,
      direction: 'none',
      good: null,
    })
    expect(byLabel.Thorns).toMatchObject({
      from: 12,
      to: null,
      direction: 'none',
      good: null,
    })
  })

  it('passes note through and reports emptiness', () => {
    const noteView = normalizeChangelog(NOTE_ONLY_CHANGELOG)
    expect(noteView.note).toContain('Wynn2 launched')
    expect(noteView.isEmpty).toBe(true)
    expect(view.isEmpty).toBe(false)
  })
})

describe('filterChangelogView', () => {
  const view = normalizeChangelog(SAMPLE_CHANGELOG)

  it('returns the view unchanged for an empty query', () => {
    expect(filterChangelogView(view, '')).toBe(view)
  })

  it('keeps only entries whose name matches, culling emptied categories', () => {
    const filtered = filterChangelogView(view, 'anvil')
    expect(filtered.items!.added).toEqual(['Anvil'])
    expect(filtered.items!.removed).toEqual([])
    expect(filtered.items!.changed).toEqual([])
    expect(filtered.atree).toBeNull()
  })
})
