import type { CdnClient } from '~/lib/data/cdn-client'
import { describe, expect, it, vi } from 'vitest'
import { loadWorldEventLoot } from './load-loot'

function mockClient(payload: unknown): CdnClient {
  return { fetchJson: vi.fn().mockResolvedValue(payload) } as unknown as CdnClient
}

describe('loadWorldEventLoot', () => {
  it('passes through a well-formed map', async () => {
    const client = mockClient({
      'Haywire Defender': {
        region: 'Ragni',
        countdown: '2m',
        delay: 'Minimal',
        drops: {
          commonIngredients: ['A'],
          possibleIngredients: [],
          exclusiveIngredients: [],
          exclusiveItems: ['B'],
          rareMobDrops: [],
          rareRandomLoots: [{ name: 'C', note: null }],
        },
      },
    })
    const out = await loadWorldEventLoot(client)
    expect(out['Haywire Defender'].drops.commonIngredients).toEqual(['A'])
    expect(client.fetchJson).toHaveBeenCalledWith('world-event-loot.json')
  })

  it('backfills missing drop arrays with empty', async () => {
    const client = mockClient({
      Sparse: { region: 'X', countdown: '', delay: '', drops: { commonIngredients: ['A'] } },
    })
    const out = await loadWorldEventLoot(client)
    expect(out.Sparse.drops.possibleIngredients).toEqual([])
    expect(out.Sparse.drops.rareRandomLoots).toEqual([])
  })
})
