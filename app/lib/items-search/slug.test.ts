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
    const master = item('Masterwork Apocalypse', 2, 'Apocalypse')
    const index = buildSlugIndex([regular, master])
    expect(itemSlug(regular)).toBe('apocalypse')
    expect(itemSlug(master)).toBe('masterwork-apocalypse')
    expect(resolveSlug(index, 'apocalypse')!.id).toBe(1)
    expect(resolveSlug(index, 'masterwork-apocalypse')!.id).toBe(2)
  })
})
