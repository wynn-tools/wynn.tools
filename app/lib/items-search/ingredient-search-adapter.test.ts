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
    expect(acid.droppedBy.length).toBeGreaterThan(0)
    expect(acid.droppedBy[0]).toMatchObject({ name: expect.any(String) })
  })

  it('handles an array-shaped file', () => {
    const list = adaptIngredients({ ingredients: [{ id: 1, displayName: 'X', tier: 0 }] } as never)
    expect(list[0]!.displayName).toBe('X')
  })

  it('passes through multi-nested droppedBy coords', () => {
    const list = adaptIngredients({
      ingredients: [{
        id: 0,
        displayName: 'X',
        tier: 0,
        droppedBy: [
          { name: 'Mob A', coords: [[100, 64, -200, 30], [110, 64, -210, 30]] },
          { name: 'Mob B', coords: null },
        ],
      }],
    } as never)
    expect(list[0]!.droppedBy).toEqual([
      { name: 'Mob A', coords: [[100, 64, -200, 30], [110, 64, -210, 30]] },
      { name: 'Mob B', coords: null },
    ])
  })

  it('normalizes single-flat coords to nested', () => {
    const list = adaptIngredients({
      ingredients: [{
        id: 0,
        displayName: 'X',
        tier: 0,
        droppedBy: [{ name: 'Mob A', coords: [100, 64, -200, 30] }],
      }],
    } as never)
    expect(list[0]!.droppedBy[0]!.coords).toEqual([[100, 64, -200, 30]])
  })

  it('defaults droppedBy to [] when absent', () => {
    const list = adaptIngredients({ ingredients: [{ id: 1, displayName: 'X', tier: 0 }] } as never)
    expect(list[0]!.droppedBy).toEqual([])
  })
})
