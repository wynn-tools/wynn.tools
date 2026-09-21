import type { SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { buildSlugIndex, itemSlug, resolveSlug, slugify } from './slug'

function item(name: string, id: number, displayName?: string): SearchItem {
  return { name, id, displayName: displayName ?? name } as SearchItem
}

describe('slug', () => {
  it('slugifies names with punctuation', () => {
    expect(slugify('Az\'s Compass')).toBe('az-s-compass')
    expect(slugify('  Idol  ')).toBe('idol')
  })

  it('builds an index and resolves uniquely', () => {
    const index = buildSlugIndex([item('Idol', 1)])
    expect(resolveSlug(index, 'idol')!.id).toBe(1)
  })

  it('gives masterwork variants their own slug via full name', () => {
    const regular = item('Apocalypse', 1)
    const master = item('Masterwork Apocalypse', 2)
    const index = buildSlugIndex([regular, master])
    expect(itemSlug(regular)).toBe('apocalypse')
    expect(itemSlug(master)).toBe('masterwork-apocalypse')
    expect(resolveSlug(index, 'apocalypse')!.id).toBe(1)
    expect(resolveSlug(index, 'masterwork-apocalypse')!.id).toBe(2)
  })

  it('slugs renamed items by display name and keeps the legacy slug as an alias', () => {
    const renamed = item('Wiggling Villager', 1, 'Wiggle Room')
    const index = buildSlugIndex([renamed])
    expect(itemSlug(renamed)).toBe('wiggle-room')
    expect(resolveSlug(index, 'wiggle-room')!.id).toBe(1)
    expect(resolveSlug(index, 'wiggling-villager')!.id).toBe(1)
  })

  it('never lets a legacy alias shadow another item\'s canonical slug', () => {
    const took = item('Foo', 1, 'Bar')
    const owner = item('Bar', 2, 'Baz')
    const index = buildSlugIndex([owner, took])
    expect(resolveSlug(index, 'bar')!.id).toBe(1)
    expect(resolveSlug(index, 'baz')!.id).toBe(2)
  })
})
