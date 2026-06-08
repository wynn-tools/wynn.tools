import type { WynndleItem } from './feedback'
import { describe, expect, it } from 'vitest'
import { computeFeedback } from './feedback'

function W(over: Partial<WynndleItem>): WynndleItem {
  return {
    id: 'x',
    name: 'x',
    mode: 'weapon',
    rarity: 'Legendary',
    level: 80,
    powders: 4,
    elements: ['fire'],
    class: 'Mage',
    dps: 1000,
    speed: 'Fast',
    ...over,
  }
}

function A(over: Partial<WynndleItem>): WynndleItem {
  return {
    id: 'x',
    name: 'x',
    mode: 'armor',
    rarity: 'Legendary',
    level: 80,
    powders: 4,
    elements: ['fire'],
    armorType: 'helmet',
    health: 2000,
    skillReqs: ['strength'],
    ...over,
  }
}

describe('weapon feedback', () => {
  it('marks exact match all-correct', () => {
    const a = W({})
    const f = computeFeedback(a, a, 'weapon')
    expect(f.class.status).toBe('correct')
    expect(f.level.status).toBe('correct')
    expect(f.dps.status).toBe('correct')
    expect(f.elements.status).toBe('correct')
  })
  it('higher arrow when guess level < answer level', () => {
    const f = computeFeedback(W({ level: 50 }), W({ level: 80 }), 'weapon')
    expect(f.level.status).toBe('higher')
  })
  it('lower arrow when guess level > answer level', () => {
    const f = computeFeedback(W({ level: 100 }), W({ level: 80 }), 'weapon')
    expect(f.level.status).toBe('lower')
  })
  it('partial when elements overlap but not equal', () => {
    const f = computeFeedback(
      W({ elements: ['fire'] }),
      W({ elements: ['fire', 'water'] }),
      'weapon',
    )
    expect(f.elements.status).toBe('partial')
  })
  it('wrong when elements disjoint', () => {
    const f = computeFeedback(W({ elements: ['air'] }), W({ elements: ['fire'] }), 'weapon')
    expect(f.elements.status).toBe('wrong')
  })
  it('speed compares via ordering', () => {
    const f = computeFeedback(W({ speed: 'Slow' }), W({ speed: 'Fast' }), 'weapon')
    expect(f.speed.status).toBe('higher')
  })
})

describe('armor feedback', () => {
  it('partial when skillReqs overlap', () => {
    const f = computeFeedback(
      A({ skillReqs: ['strength'] }),
      A({ skillReqs: ['strength', 'dexterity'] }),
      'armor',
    )
    expect(f.skillReqs.status).toBe('partial')
  })
  it('marks correct armorType', () => {
    const f = computeFeedback(A({ armorType: 'helmet' }), A({ armorType: 'helmet' }), 'armor')
    expect(f.type.status).toBe('correct')
  })
})
