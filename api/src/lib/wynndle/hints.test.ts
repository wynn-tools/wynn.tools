import type { WynndleItem } from './feedback'
import { describe, expect, it } from 'vitest'
import { deriveHint } from './hints'

const weapon: WynndleItem = {
  id: 'a',
  name: 'Fission',
  mode: 'weapon',
  rarity: 'Mythic',
  level: 95,
  powders: 0,
  elements: ['fire'],
  class: 'Archer',
  dps: 9000,
  speed: 'Fast',
}
const armor: WynndleItem = {
  id: 'a',
  name: 'tarnhelm',
  mode: 'armor',
  rarity: 'Legendary',
  level: 65,
  powders: 2,
  elements: [],
  armorType: 'helmet',
  health: 1000,
  skillReqs: [],
}

describe('hints', () => {
  it('hint 1 = class for weapon', () => {
    expect(deriveHint(weapon, 1)).toEqual({ kind: 'type', value: 'Archer' })
  })
  it('hint 1 = armorType for armor', () => {
    expect(deriveHint(armor, 1)).toEqual({ kind: 'type', value: 'helmet' })
  })
  it('hint 2 = level range bucket of 10', () => {
    expect(deriveHint(weapon, 2)).toEqual({ kind: 'levelRange', value: '90-99' })
    expect(deriveHint(armor, 2)).toEqual({ kind: 'levelRange', value: '60-69' })
  })
  it('hint 3 = rarity', () => {
    expect(deriveHint(weapon, 3)).toEqual({ kind: 'rarity', value: 'Mythic' })
  })
  it('hint 4 = first letter uppercased', () => {
    expect(deriveHint(weapon, 4)).toEqual({ kind: 'letter', value: 'F' })
    expect(deriveHint(armor, 4)).toEqual({ kind: 'letter', value: 'T' })
  })
})
