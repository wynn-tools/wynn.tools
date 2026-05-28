import type { SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { buildSlugIndex, itemSlug, resolveSlug, slugify } from './slug'

function item(displayName: string, id: number): SearchItem {
  return { displayName, id } as SearchItem
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

  it('disambiguates collisions by name', () => {
    const index = buildSlugIndex([item('Idol', 1), item('Idol', 2)])
    expect(resolveSlug(index, itemSlug(item('Idol', 0)), 'Idol')!.displayName).toBe('Idol')
  })
})
