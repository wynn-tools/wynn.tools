import type { JoinedWorldEvent } from './types'
import { describe, expect, it } from 'vitest'
import { sortWorldEvents } from './sort'

function j(name: string, level: number, schedule: string | null = null): JoinedWorldEvent {
  return {
    event: {
      name,
      level,
      schedule,
      internalName: '',
      lore: '',
      difficulty: 'EASY',
      length: 'SHORT',
      rewardPerLevel: [],
      requirements: [],
      location: [],
    },
    slug: name,
    loot: null,
    resolved: null,
  }
}

const NOW = Date.parse('2026-06-12T00:00:00Z')

describe('sortWorldEvents', () => {
  const events = [j('B', 5, '2026-06-12T01:00:00Z'), j('A', 10), j('C', 1, '2026-06-12T00:30:00Z')]
  it('sorts by level ascending', () => {
    expect(sortWorldEvents(events, 'level', NOW).map(e => e.event.name)).toEqual(['C', 'B', 'A'])
  })
  it('sorts by name', () => {
    expect(sortWorldEvents(events, 'name', NOW).map(e => e.event.name)).toEqual(['A', 'B', 'C'])
  })
  it('sorts by nextSpawn with nulls last', () => {
    expect(sortWorldEvents(events, 'nextSpawn', NOW).map(e => e.event.name)).toEqual(['C', 'B', 'A'])
  })
})
