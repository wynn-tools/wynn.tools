import { describe, expect, it } from 'vitest'
import setsFixture from '../__fixtures__/cdn/sets.json'
import { adaptCdnSets } from './sets-adapter'

describe('adaptCdnSets', () => {
  const result = adaptCdnSets(setsFixture)

  it('keys the map by set name', () => {
    expect(result.has('Adventurer')).toBe(true)
    expect(result.has('Air Relic')).toBe(true)
    expect(result.has('Ascension')).toBe(true)
    expect(result.has('Bandit\'s')).toBe(true)
    expect(result.has('Beachside')).toBe(true)
  })

  it('passes items through unchanged', () => {
    expect(result.get('Adventurer')!.items).toEqual([
      'Adventurer\'s Boots',
      'Adventurer\'s Tunic',
      'Adventurer\'s Cap',
      'Adventurer\'s Pants',
    ])
  })

  it('builds a dense bonus array of length max-pieces for Adventurer (pieces 2/3/4 → length 4)', () => {
    const { bonuses } = result.get('Adventurer')!
    expect(bonuses).toHaveLength(4)
  })

  it('fills index 0 with empty object (no 1-piece bonus in fixture)', () => {
    const { bonuses } = result.get('Adventurer')!
    expect(bonuses[0]).toEqual({})
  })

  it('places the 2-piece bonus at index 1 with converted shorthand keys', () => {
    const { bonuses } = result.get('Adventurer')!
    expect(bonuses[1]).toEqual({
      xpb: 10,
      damPct: 4,
      lb: 5,
      hpBonus: 15,
      spd: 2,
    })
  })

  it('places the 3-piece bonus at index 2 with correct values', () => {
    const { bonuses } = result.get('Adventurer')!
    expect(bonuses[2]).toEqual({
      xpb: 20,
      damPct: 12,
      lb: 10,
      hpBonus: 40,
      spd: 5,
    })
  })

  it('places the 4-piece bonus at index 3 with manaRegen included', () => {
    const { bonuses } = result.get('Adventurer')!
    expect(bonuses[3]).toEqual({
      xpb: 50,
      damPct: 25,
      lb: 30,
      mr: 12,
      hpBonus: 175,
      spd: 15,
    })
  })

  it('no bonus record contains a majorIds key', () => {
    for (const [, set] of result) {
      for (const bonus of set.bonuses) {
        expect(Object.keys(bonus)).not.toContain('majorIds')
      }
    }
  })

  it('integration: math access bonuses[count - 1] returns the 2-piece bonus for count=2', () => {
    const count = 2
    const set = result.get('Adventurer')!
    const bonus = set.bonuses[count - 1]
    expect(bonus).toEqual({
      xpb: 10,
      damPct: 4,
      lb: 5,
      hpBonus: 15,
      spd: 2,
    })
  })

  it('ascension: single 4-piece bonus → length 4, indices 0-2 empty, index 3 has conversions', () => {
    const { bonuses } = result.get('Ascension')!
    expect(bonuses).toHaveLength(4)
    expect(bonuses[0]).toEqual({})
    expect(bonuses[1]).toEqual({})
    expect(bonuses[2]).toEqual({})
    expect(bonuses[3].damPct).toBe(75)
    expect(bonuses[3].hprRaw).toBe(600)
    expect(bonuses[3].ls).toBe(500)
    expect(bonuses[3].mr).toBe(30)
    expect(bonuses[3].ms).toBe(20)
  })

  it('beachside: single 2-piece bonus → length 2, index 0 empty, index 1 correct', () => {
    const { bonuses } = result.get('Beachside')!
    expect(bonuses).toHaveLength(2)
    expect(bonuses[0]).toEqual({})
    expect(bonuses[1]).toEqual({
      healPct: 20,
      lb: 20,
      maxMana: 30,
      wDefPct: 25,
    })
  })
})
