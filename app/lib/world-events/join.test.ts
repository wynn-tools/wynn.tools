import type { WorldEventLootMap } from './types'
import type { SearchIngredient, SearchItem } from '~/lib/items-search/types'
import type { WorldEvent } from '~/types/map'
import { describe, expect, it, vi } from 'vitest'
import { joinWorldEvents } from './join'

function ev(name: string): WorldEvent {
  return {
    name,
    internalName: name,
    lore: '',
    difficulty: 'EASY',
    level: 1,
    length: 'SHORT',
    rewardPerLevel: [],
    requirements: [],
    location: [],
    schedule: null,
  }
}

const bloodIng = { name: 'Blood of the Nivlan Beauty', tier: 3 } as unknown as SearchIngredient
const guardItem = { name: 'Guard\'s Garment', tier: 'unique', type: 'armour' } as unknown as SearchItem

const ingredients = new Map<string, SearchIngredient>([
  ['Blood of the Nivlan Beauty', bloodIng],
])
const items = new Map<string, SearchItem>([
  ['Guard\'s Garment', guardItem],
])

const loot: WorldEventLootMap = {
  'Haywire Defender': {
    region: 'Ragni',
    countdown: '2m',
    delay: 'Minimal',
    drops: {
      commonIngredients: ['Blood of the Nivlan Beauty', 'Unknown Thing'],
      possibleIngredients: [],
      exclusiveIngredients: [],
      exclusiveItems: ['Guard\'s Garment', 'Mystery Item'],
      rareMobDrops: [],
      rareRandomLoots: [{ name: 'Lunar Charm', note: 'sometimes' }],
    },
  },
  'Orphan': {
    region: 'X',
    countdown: '',
    delay: '',
    drops: {
      commonIngredients: [],
      possibleIngredients: [],
      exclusiveIngredients: [],
      exclusiveItems: [],
      rareMobDrops: [],
      rareRandomLoots: [],
    },
  },
}

describe('joinWorldEvents', () => {
  it('joins event + loot and resolves ingredient tiers', () => {
    const out = joinWorldEvents([ev('Haywire Defender')], loot, ingredients, items)
    expect(out).toHaveLength(1)
    expect(out[0].slug).toBe('haywire-defender')
    expect(out[0].loot?.region).toBe('Ragni')
    expect(out[0].resolved?.commonIngredients[0]).toEqual({ name: 'Blood of the Nivlan Beauty', ingredient: bloodIng })
    expect(out[0].resolved?.commonIngredients[1]).toEqual({ name: 'Unknown Thing' })
    expect(out[0].resolved?.exclusiveItems[0].item).toBe(guardItem)
    expect(out[0].resolved?.exclusiveItems[1]).toEqual({ name: 'Mystery Item' })
    expect(out[0].resolved?.rareRandomLoots[0]).toEqual({ name: 'Lunar Charm', note: 'sometimes' })
  })

  it('keeps API events without loot (loot=null)', () => {
    const out = joinWorldEvents([ev('No Loot Event')], loot, ingredients, items)
    expect(out[0].loot).toBeNull()
    expect(out[0].resolved).toBeNull()
  })

  it('drops loot entries without API events and warns', () => {
    const warn = vi.fn()
    joinWorldEvents([ev('Haywire Defender')], loot, ingredients, items, warn)
    expect(warn).toHaveBeenCalledWith('Orphan')
  })
})
