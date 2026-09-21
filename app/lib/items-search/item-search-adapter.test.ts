import type { OutputItem } from '~/lib/data/cdn-adapter/item-adapter'
import { describe, expect, it } from 'vitest'
import fixtureData from '~/../app/lib/data/__fixtures__/cdn/items.json'
import { adaptItems } from './item-search-adapter'

const file = fixtureData as { items: OutputItem[] }

describe('adaptItems', () => {
  it('preserves identification ranges', () => {
    const items = adaptItems(file)
    const withId = items.find(i => Object.keys(i.identifications).length > 0)!
    const range = Object.values(withId.identifications)[0]!
    expect(range).toHaveProperty('min')
    expect(range).toHaveProperty('max')
    expect(range).toHaveProperty('raw')
  })

  it('reads level from requirements', () => {
    const items = adaptItems(file)
    expect(items.every(i => typeof i.level === 'number')).toBe(true)
  })

  it('skips remapID redirects', () => {
    const items = adaptItems({
      items: [
        { remapID: 5 } as never,
        file.items[0]!,
      ],
    })
    expect(items).toHaveLength(1)
  })

  it('passes through the new schema fields', () => {
    const [item] = adaptItems({
      items: [{
        ...file.items[0]!,
        emblem: 'shield_6',
        averageDps: 1234,
        elements: ['earth', 'thunder'],
        sets: ['Some Set'],
        set: 'Some Set',
      } as never],
    })
    expect(item).toMatchObject({
      emblem: 'shield_6',
      averageDps: 1234,
      elements: ['earth', 'thunder'],
      sets: ['Some Set'],
      set: 'Some Set',
    })
  })

  it('defaults new fields and derives sets from legacy set', () => {
    const [withSet] = adaptItems({ items: [{ ...file.items[0]!, set: 'Legacy', sets: undefined } as never] })
    expect(withSet!.sets).toEqual(['Legacy'])
    const [bare] = adaptItems({ items: [{ ...file.items[0]!, set: null, sets: undefined, emblem: undefined, averageDps: undefined, elements: undefined } as never] })
    expect(bare).toMatchObject({ set: null, sets: [], emblem: null, averageDps: null, elements: [] })
  })

  it('uses displayName as the label, falling back to name when displayName collides', () => {
    const base = file.items[0]!
    const items = adaptItems({
      items: [
        { ...base, id: 1, name: 'Wiggling Villager', displayName: 'Wiggle Room' },
        { ...base, id: 2, name: 'Apocalypse', displayName: 'Apocalypse' },
        { ...base, id: 3, name: 'Masterwork Apocalypse', displayName: 'Apocalypse' },
        { ...base, id: 4, name: 'Plain', displayName: undefined } as never,
        { remapID: 4, name: 'Plain', displayName: 'Plain' } as never,
      ],
    })
    expect(items.map(i => i.displayName)).toEqual(['Wiggle Room', 'Apocalypse', 'Masterwork Apocalypse', 'Plain'])
  })
})
