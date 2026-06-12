import type { ItemSourcesFile } from './types'
import { describe, expect, it } from 'vitest'
import { sourcesForItem } from './lookup'

const file: ItemSourcesFile = {
  items: {
    Dondasch: [
      { type: 'specificMobDrop', name: 'Adamastor', wiki: 'a', level: 100, location: 'Aerie' },
    ],
    Ablution: [
      { type: 'merchant', name: 'Almuj', trades: [{ merchant: 'Almuj Weapon Merchant', inputs: [{ item: 'Emeralds', amount: 104 }] }] },
    ],
  },
}

describe('sourcesForItem', () => {
  it('returns entries for a known item', () => {
    expect(sourcesForItem('Dondasch', file)).toHaveLength(1)
    expect(sourcesForItem('Dondasch', file)[0]!.type).toBe('specificMobDrop')
  })

  it('returns merchant trades for a known item', () => {
    const got = sourcesForItem('Ablution', file)[0]!
    expect(got.trades?.[0]!.inputs[0]).toEqual({ item: 'Emeralds', amount: 104 })
  })

  it('returns an empty array for unknown items', () => {
    expect(sourcesForItem('Imaginary Sword', file)).toEqual([])
  })
})
