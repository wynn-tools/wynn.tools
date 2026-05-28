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
})
