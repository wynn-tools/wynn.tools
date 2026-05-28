import type { CdnClient } from '~/lib/data/cdn-client'
import { describe, expect, it } from 'vitest'
import ingredientsFixture from '~/../app/lib/data/__fixtures__/cdn/ingredients.json'
import itemsFixture from '~/../app/lib/data/__fixtures__/cdn/items.json'
import versionsFixture from '~/../app/lib/data/__fixtures__/cdn/versions.json'
import { loadSearchData } from './load-search-data'

function fakeClient(): CdnClient {
  return {
    fetchJson: async <T>(path: string): Promise<T> => {
      if (path === 'versions.json')
        return versionsFixture as T
      if (path.endsWith('items.json'))
        return itemsFixture as T
      if (path.endsWith('ingredients.json'))
        return ingredientsFixture as T
      throw new Error(`unexpected path ${path}`)
    },
  }
}

describe('loadSearchData', () => {
  it('loads and adapts items + ingredients for the latest version', async () => {
    const data = await loadSearchData(fakeClient())
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.ingredients.length).toBeGreaterThan(0)
    expect(typeof data.gameVersion).toBe('string')
  })
})
