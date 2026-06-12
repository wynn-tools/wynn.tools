import { describe, expect, it } from 'vitest'
import { adaptIngredients } from './ingredient-adapter'

// Raw payloads copied verbatim from
// cdn.wynn.tools/data/pending/ingredients.json (Acid Magma id=0,
// Alnamar Meat id=1, Altered Ash id=2).
const ACID_MAGMA_RAW = {
  consumableOnlyIDs: { charges: 0, duration: -90 },
  displayName: 'Acid Magma',
  icon: {
    format: 'attribute',
    value: {
      customModelData: { rangeDispatch: [1689] },
      id: 'minecraft:potion',
      name: 'ingredient.acidMagma',
    },
  },
  id: 0,
  identifications: {
    poison: { max: 1990, min: 1940, raw: 1940 },
    waterDefence: { max: -8, min: -10, raw: -10 },
  },
  ingredientPositionModifiers: {
    above: 0,
    left: 0,
    notTouching: 0,
    right: 0,
    touching: 0,
    under: 0,
  },
  itemOnlyIDs: {
    agilityRequirement: 0,
    defenceRequirement: 8,
    dexterityRequirement: 0,
    durabilityModifier: -49,
    intelligenceRequirement: 0,
    strengthRequirement: 0,
  },
  name: 'Acid Magma',
  requirements: { level: 91, skills: ['tailoring', 'alchemism'] },
  tier: 0,
}

const ALNAMAR_MEAT_RAW = {
  consumableOnlyIDs: { charges: 0, duration: -290 },
  displayName: 'Alnamar Meat',
  icon: {
    format: 'attribute',
    value: {
      customModelData: { rangeDispatch: [1701] },
      id: 'minecraft:potion',
      name: 'ingredient.alnamarMeat',
    },
  },
  id: 1,
  identifications: {
    earthDefence: { max: -7, min: -9, raw: -9 },
    fireDefence: { max: 8, min: 7, raw: 7 },
    thunderDefence: { max: 10, min: 7, raw: 7 },
  },
  ingredientPositionModifiers: {
    above: 0,
    left: 0,
    notTouching: 0,
    right: 0,
    touching: 0,
    under: 0,
  },
  itemOnlyIDs: {
    agilityRequirement: 0,
    defenceRequirement: 0,
    dexterityRequirement: 0,
    durabilityModifier: 0,
    intelligenceRequirement: 0,
    strengthRequirement: 0,
  },
  name: 'Alnamar Meat',
  requirements: { level: 103, skills: ['cooking'] },
  tier: 0,
}

const ALTERED_ASH_RAW = {
  consumableOnlyIDs: { charges: 0, duration: -45 },
  displayName: 'Altered Ash',
  icon: {
    format: 'attribute',
    value: {
      customModelData: { rangeDispatch: [1702] },
      id: 'minecraft:potion',
      name: 'ingredient.alteredAsh',
    },
  },
  id: 2,
  identifications: {
    spellDamage: { max: 5, min: 1, raw: 1 },
  },
  ingredientPositionModifiers: {
    above: 0,
    left: 0,
    notTouching: 0,
    right: 0,
    touching: 0,
    under: 0,
  },
  itemOnlyIDs: {
    agilityRequirement: 0,
    defenceRequirement: 0,
    dexterityRequirement: 0,
    durabilityModifier: 0,
    intelligenceRequirement: 0,
    strengthRequirement: 0,
  },
  name: 'Altered Ash',
  requirements: { level: 15, skills: ['alchemism', 'scribing'] },
  tier: 0,
}

describe('adaptIngredients', () => {
  it('returns one adapted ingredient per input entry', () => {
    const result = adaptIngredients({
      ingredients: [ACID_MAGMA_RAW, ALNAMAR_MEAT_RAW, ALTERED_ASH_RAW],
    })
    expect(result).toHaveLength(3)
  })

  it('adapts Acid Magma (id 0) to shorthand schema', () => {
    const [acidMagma] = adaptIngredients({ ingredients: [ACID_MAGMA_RAW] })
    expect(acidMagma).toEqual({
      id: 0,
      name: 'Acid Magma',
      displayName: 'Acid Magma',
      tier: 0,
      lvl: 91,
      skills: ['tailoring', 'alchemism'],
      identifications: {
        poison: { min: 1940, max: 1990, raw: 1940 },
        wDefPct: { min: -10, max: -8, raw: -10 },
      },
      itemOnlyIDs: {
        durabilityModifier: -49,
        strReq: 0,
        dexReq: 0,
        intReq: 0,
        defReq: 8,
        agiReq: 0,
      },
      consumableOnlyIDs: { charges: 0, duration: -90 },
      posMods: {
        above: 0,
        under: 0,
        left: 0,
        right: 0,
        touching: 0,
        notTouching: 0,
      },
      icon: {
        format: 'attribute',
        value: {
          customModelData: { rangeDispatch: [1689] },
          id: 'minecraft:potion',
          name: 'ingredient.acidMagma',
        },
      },
    })
  })

  it('adapts Alnamar Meat (id 1) — multiple element defence ids', () => {
    const [alnamar] = adaptIngredients({ ingredients: [ALNAMAR_MEAT_RAW] })
    expect(alnamar).toEqual({
      id: 1,
      name: 'Alnamar Meat',
      displayName: 'Alnamar Meat',
      tier: 0,
      lvl: 103,
      skills: ['cooking'],
      identifications: {
        eDefPct: { min: -9, max: -7, raw: -9 },
        fDefPct: { min: 7, max: 8, raw: 7 },
        tDefPct: { min: 7, max: 10, raw: 7 },
      },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 0,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
      consumableOnlyIDs: { charges: 0, duration: -290 },
      posMods: {
        above: 0,
        under: 0,
        left: 0,
        right: 0,
        touching: 0,
        notTouching: 0,
      },
      icon: {
        format: 'attribute',
        value: {
          customModelData: { rangeDispatch: [1701] },
          id: 'minecraft:potion',
          name: 'ingredient.alnamarMeat',
        },
      },
    })
  })

  it('adapts Altered Ash (id 2) — single identification entry', () => {
    const [ash] = adaptIngredients({ ingredients: [ALTERED_ASH_RAW] })
    expect(ash).toEqual({
      id: 2,
      name: 'Altered Ash',
      displayName: 'Altered Ash',
      tier: 0,
      lvl: 15,
      skills: ['alchemism', 'scribing'],
      identifications: {
        sdPct: { min: 1, max: 5, raw: 1 },
      },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 0,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
      consumableOnlyIDs: { charges: 0, duration: -45 },
      posMods: {
        above: 0,
        under: 0,
        left: 0,
        right: 0,
        touching: 0,
        notTouching: 0,
      },
      icon: {
        format: 'attribute',
        value: {
          customModelData: { rangeDispatch: [1702] },
          id: 'minecraft:potion',
          name: 'ingredient.alteredAsh',
        },
      },
    })
  })
})
