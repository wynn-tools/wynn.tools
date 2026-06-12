import type { ItemSourcesFile } from './types'
import { describe, expect, it } from 'vitest'
import { mobsForItem } from './lookup'

const file: ItemSourcesFile = {
  mobs: {
    Adamastor: { wiki: 'a', drops: { guaranteed: ['Emerald Blocks'], exclusive: ['Dondasch', 'Eidolon'] } },
    Garoth: { wiki: 'g', drops: { guaranteed: [], exclusive: ['Garoth\'s Writings'] } },
  },
}

describe('mobsForItem', () => {
  it('finds exclusive drops', () => {
    expect(mobsForItem('Dondasch', file)).toEqual([{ mob: 'Adamastor', wiki: 'a', kind: 'exclusive' }])
  })

  it('finds guaranteed drops', () => {
    expect(mobsForItem('Emerald Blocks', file)).toEqual([{ mob: 'Adamastor', wiki: 'a', kind: 'guaranteed' }])
  })

  it('returns empty for unknown items', () => {
    expect(mobsForItem('Imaginary Sword', file)).toEqual([])
  })
})
