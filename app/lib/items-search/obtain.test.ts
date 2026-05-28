import type { SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { obtainInfo } from './obtain'

function mk(p: Partial<SearchItem>): SearchItem {
  return { dropRestriction: 'normal', level: 50, requirements: { level: 50 } as never, ...p } as SearchItem
}

describe('obtainInfo', () => {
  it('lootchest', () => {
    expect(obtainInfo(mk({ dropRestriction: 'lootchest' }))[0]!.kind).toBe('lootchest')
  })
  it('normal yields mobs + anyLootchest', () => {
    expect(obtainInfo(mk({ dropRestriction: 'normal' })).map(m => m.kind)).toEqual(['mobs', 'anyLootchest'])
  })
  it('never + quest', () => {
    const m = obtainInfo(mk({ dropRestriction: 'never', requirements: { level: 50, quest: 'Reincarnation' } as never }))
    expect(m[0]!.kind).toBe('quest')
    expect(m[0]!.quest).toBe('Reincarnation')
  })
  it('never without quest is unknown', () => {
    expect(obtainInfo(mk({ dropRestriction: 'never' }))[0]!.kind).toBe('unknown')
  })
})
