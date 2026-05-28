import { describe, expect, it } from 'vitest'
import { adaptRecipes } from './recipe-adapter'

describe('adaptRecipes', () => {
  it('adapts a tailoring boots recipe with hp split', () => {
    const raw = {
      recipes: [
        {
          durability: { max: 575000, min: 571000 },
          healthOrDamage: { max: 3004, min: 2955 },
          id: 1890,
          level: { max: 119, min: 117 },
          materials: [
            { amount: 7, item: 'Refined Cinnabar Ingot' },
            { amount: 14, item: 'Refined Heather String' },
          ],
          name: 'Boots117-119',
          skill: 'tailoring',
          type: 'boots',
        },
      ],
    }
    expect(adaptRecipes(raw)).toEqual([
      {
        id: 1890,
        name: 'Boots117-119',
        type: 'boots',
        skill: 'tailoring',
        lvl: [117, 119],
        durability: [571000, 575000],
        hp: [2955, 3004],
        materials: [
          { item: 'Refined Cinnabar Ingot', amount: 7 },
          { item: 'Refined Heather String', amount: 14 },
        ],
      },
    ])
  })

  it('adapts a weaponsmithing dagger recipe with damage split', () => {
    const raw = {
      recipes: [
        {
          durability: { max: 575000, min: 571000 },
          healthOrDamage: { max: 243, min: 241 },
          id: 2082,
          level: { max: 119, min: 117 },
          materials: [
            { amount: 14, item: 'Refined Cinnabar Ingot' },
            { amount: 7, item: 'Refined Redwood Wood' },
          ],
          name: 'Dagger117-119',
          skill: 'weaponsmithing',
          type: 'dagger',
        },
      ],
    }
    expect(adaptRecipes(raw)).toEqual([
      {
        id: 2082,
        name: 'Dagger117-119',
        type: 'dagger',
        skill: 'weaponsmithing',
        lvl: [117, 119],
        durability: [571000, 575000],
        damage: [241, 243],
        materials: [
          { item: 'Refined Cinnabar Ingot', amount: 14 },
          { item: 'Refined Redwood Wood', amount: 7 },
        ],
      },
    ])
  })

  it('adapts an alchemism potion recipe with hp split', () => {
    const raw = {
      recipes: [
        {
          durability: { max: 0, min: 0 },
          healthOrDamage: { max: 6876, min: 6620 },
          id: 2322,
          level: { max: 119, min: 117 },
          materials: [
            { amount: 7, item: 'Refined Mahseer Oil' },
            { amount: 14, item: 'Refined Heather Grains' },
          ],
          name: 'Potion117-119',
          skill: 'alchemism',
          type: 'potion',
        },
      ],
    }
    expect(adaptRecipes(raw)).toEqual([
      {
        id: 2322,
        name: 'Potion117-119',
        type: 'potion',
        skill: 'alchemism',
        lvl: [117, 119],
        durability: [0, 0],
        hp: [6620, 6876],
        materials: [
          { item: 'Refined Mahseer Oil', amount: 7 },
          { item: 'Refined Heather Grains', amount: 14 },
        ],
      },
    ])
  })
})
