import { describe, expect, it } from 'vitest'
import { itemIconUrl } from './icon'

describe('itemIconUrl', () => {
  it('builds a .webp URL from an attribute icon name', () => {
    expect(itemIconUrl({ icon: { format: 'attribute', value: { name: 'wand.water3' } } }))
      .toBe('https://cdn.wynn.tools/nextgen/itemguide/3.3/wand.water3.webp')
  })

  it('returns null for skin (player-head) icons', () => {
    expect(itemIconUrl({ icon: { format: 'skin', value: 'deadbeef' } })).toBeNull()
  })

  it('returns null when there is no icon', () => {
    expect(itemIconUrl({})).toBeNull()
    expect(itemIconUrl(null)).toBeNull()
  })
})
