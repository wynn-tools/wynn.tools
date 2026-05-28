import { describe, expect, it } from 'vitest'
import fixtureData from '~/../app/lib/data/__fixtures__/cdn/ingredients.json'
import { adaptIngredients } from './ingredient-search-adapter'

describe('adaptIngredients', () => {
  it('adapts the CDN ingredient fixture', () => {
    const list = adaptIngredients(fixtureData as never)
    expect(list.length).toBeGreaterThan(0)
    const acid = list.find(i => i.displayName === 'Acid Magma')!
    expect(acid.level).toBe(91)
    expect(acid.skills).toContain('alchemism')
    expect(acid.identifications.poison).toMatchObject({ raw: 1940 })
  })

  it('handles an array-shaped file', () => {
    const list = adaptIngredients({ ingredients: [{ id: 1, displayName: 'X', tier: 0 }] } as never)
    expect(list[0]!.displayName).toBe('X')
  })
})
