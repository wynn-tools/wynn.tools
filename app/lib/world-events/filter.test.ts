import type { JoinedWorldEvent } from './types'
import { describe, expect, it } from 'vitest'
import { defaultFilter, filterWorldEvents } from './filter'

function mk(over: Partial<JoinedWorldEvent['event']> & { drops?: string[] } = {}): JoinedWorldEvent {
  return {
    event: {
      name: 'X',
      internalName: 'x',
      lore: '',
      difficulty: 'EASY',
      level: 10,
      length: 'SHORT',
      rewardPerLevel: [],
      requirements: [],
      location: [],
      schedule: null,
      ...over,
    },
    slug: 'x',
    loot: {
      region: 'Ragni',
      countdown: '',
      delay: '',
      drops: {
        commonIngredients: over.drops ?? [],
        possibleIngredients: [],
        exclusiveIngredients: [],
        exclusiveItems: [],
        rareMobDrops: [],
        rareRandomLoots: [],
      },
    },
    resolved: null,
  }
}

describe('filterWorldEvents', () => {
  const events = [
    mk({ name: 'Haywire Defender', level: 3, difficulty: 'MEDIUM', drops: ['Blood'] }),
    mk({ name: 'Approaching Raid', level: 5, difficulty: 'EASY', schedule: '2030-01-01T00:00:00Z' }),
    mk({ name: 'Hard One', level: 50, difficulty: 'HARD', length: 'LONG' }),
  ]

  it('search by name (case-insensitive)', () => {
    const out = filterWorldEvents(events, { ...defaultFilter(), search: 'raid' })
    expect(out.map(j => j.event.name)).toEqual(['Approaching Raid'])
  })
  it('level range', () => {
    const out = filterWorldEvents(events, { ...defaultFilter(), levelMin: 4, levelMax: 10 })
    expect(out.map(j => j.event.name)).toEqual(['Approaching Raid'])
  })
  it('difficulty', () => {
    const out = filterWorldEvents(events, { ...defaultFilter(), difficulties: ['HARD'] })
    expect(out.map(j => j.event.name)).toEqual(['Hard One'])
  })
  it('hasSchedule', () => {
    const out = filterWorldEvents(events, { ...defaultFilter(), hasSchedule: true })
    expect(out.map(j => j.event.name)).toEqual(['Approaching Raid'])
  })
  it('dropsIngredient', () => {
    const out = filterWorldEvents(events, { ...defaultFilter(), dropsIngredient: 'Blood' })
    expect(out.map(j => j.event.name)).toEqual(['Haywire Defender'])
  })
})
