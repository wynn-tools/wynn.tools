import { describe, expect, it } from 'vitest'
import { playerFavoredValue, playerUnfavoredValue } from './roll-basis'

const positive = { min: 3, max: 13, raw: 10 }
const inverted = { min: -13, max: -3, raw: -10 }

describe('playerFavoredValue', () => {
  it('returns max for normal IDs at possible basis', () => {
    expect(playerFavoredValue(positive, 'strengthPoints', 'possible')).toBe(13)
  })
  it('returns min for normal IDs at guaranteed basis', () => {
    expect(playerFavoredValue(positive, 'strengthPoints', 'guaranteed')).toBe(3)
  })
  it('returns min for inverted IDs at possible basis', () => {
    expect(playerFavoredValue(inverted, '1stSpellCost', 'possible')).toBe(-13)
  })
  it('returns max for inverted IDs at guaranteed basis', () => {
    expect(playerFavoredValue(inverted, '1stSpellCost', 'guaranteed')).toBe(-3)
  })
  it('returns 0 for missing entries', () => {
    expect(playerFavoredValue(undefined, 'strengthPoints', 'possible')).toBe(0)
  })
})

describe('playerUnfavoredValue', () => {
  it('is the opposite end from playerFavoredValue', () => {
    expect(playerUnfavoredValue(positive, 'strengthPoints', 'possible')).toBe(3)
    expect(playerUnfavoredValue(inverted, '1stSpellCost', 'possible')).toBe(-3)
  })
})
