import type { SearchItem } from '~/lib/items-search/types'
import { describe, expect, it } from 'vitest'
import { extractItemMeta } from './item-meta'

function makeItem(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    id: 1,
    name: 'Test Item',
    displayName: 'Test Item',
    type: 'armour',
    subType: 'helmet',
    tier: 'Legendary',
    level: 100,
    requirements: {
      level: 100,
      intelligence: 40,
    } as SearchItem['requirements'],
    powderSlots: 2,
    restriction: null,
    dropRestriction: 'normal',
    attackSpeed: null,
    majorIds: [],
    base: { health: 3000, waterDefence: 120 },
    identifications: {
      rawIntelligence: { min: 5, max: 9, raw: 7 },
      spellDamage: { min: 8, max: 12, raw: 10 },
    },
    lore: [
      {
        text: 'A test relic.',
        color: '#aaaaaa',
        font: null,
      } as SearchItem['lore'][number],
    ],
    set: null,
    sets: [],
    emblem: null,
    averageDps: null,
    elements: ['water'],
    icon: undefined,
    ...overrides,
  }
}

describe('extractItemMeta', () => {
  it('flattens an armour item: health + defence lines, no dps', () => {
    const meta = extractItemMeta(makeItem())
    expect(meta.isWeapon).toBe(false)
    expect(meta.dps).toBeNull()
    expect(meta.health).toBe(3000)
    expect(meta.defenceLines).toEqual([
      {
        iconUrl: expect.stringContaining('attributes/water.png'),
        value: '+120',
      },
    ])
  })

  it('flattens a weapon: dps, attack-speed label, damage lines', () => {
    const meta = extractItemMeta(
      makeItem({
        type: 'weapon',
        subType: 'wand',
        attackSpeed: 'NORMAL',
        averageDps: 540,
        base: {
          damage: { min: 50, max: 70, raw: 60 },
          fireDamage: { min: 10, max: 20, raw: 15 },
        },
      }),
    )
    expect(meta.isWeapon).toBe(true)
    expect(meta.dps).toBe(540)
    expect(meta.attackSpeed).toMatch(/normal/i)
    expect(meta.damageLines).toHaveLength(2)
    // Neutral damage renders the neutral icon, matching Item/Tooltip.vue.
    expect(meta.damageLines[0]).toEqual({
      iconUrl: expect.stringContaining('attributes/neutral.png'),
      text: '50-70',
    })
  })

  it('resolves ID rows with good/bad colors and min/max formatting', () => {
    const meta = extractItemMeta(makeItem())
    const spell = meta.idRows.find(r =>
      r.label.toLowerCase().includes('spell'),
    )!
    expect(spell.left).toBe('8%')
    expect(spell.right).toBe('12%')
    expect(spell.color).toBe('#83f7c6') // ID_GOOD_COLOR
  })

  it('resolves SP circles: active disc/icon/check urls + value color', () => {
    const meta = extractItemMeta(makeItem())
    const intel = meta.sp.find(s => s.skill === 'intelligence')!
    expect(intel.active).toBe(true)
    expect(intel.value).toBe(40)
    expect(intel.discUrl).toContain('sp/legendary.png')
    expect(intel.iconUrl).toContain('sp/intelligence.png')
    expect(intel.checkUrl).toContain('check.png')
    const str = meta.sp.find(s => s.skill === 'strength')!
    expect(str.active).toBe(false)
    expect(str.discUrl).toContain('sp/disabled.png')
    expect(str.iconUrl).toContain('sp/strength_off.png')
  })

  it('falls back to the PNG sprite when the item has no webp icon', () => {
    const meta = extractItemMeta(
      makeItem({ icon: undefined, subType: 'helmet' }),
    )
    expect(meta.icon).toContain('sprites/helmet.png')
  })

  it('uses the webp icon when present', () => {
    const meta = extractItemMeta(
      makeItem({
        icon: {
          format: 'attribute',
          value: { id: 'x', name: 'helmet.water3' },
        },
      }),
    )
    expect(meta.icon).toContain('helmet.water3.webp')
  })

  it('flattens major IDs to plain strings and keeps lore text+color', () => {
    const meta = extractItemMeta(
      makeItem({
        majorIds: [
          {
            name: 'Cherish',
            description: [
              { text: 'Heal ', color: null },
              { text: '+20%', color: '#fff' },
            ],
          },
        ] as SearchItem['majorIds'],
      }),
    )
    expect(meta.majorIds).toEqual([{ name: 'Cherish', text: 'Heal +20%' }])
    expect(meta.lore).toEqual([{ text: 'A test relic.', color: '#aaaaaa' }])
  })
})
