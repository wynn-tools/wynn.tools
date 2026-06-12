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
    expect(out.Sparse.drops.rareMobDrops).toEqual([])
  })

  it('parses rareMobDrops object form with drops, tier, note', async () => {
    const client = mockClient({
      Infernal: {
        region: 'Molten Heights',
        countdown: '6-7m',
        delay: 'Long',
        drops: {
          rareMobDrops: [
            {
              name: 'Pyroclastic Hydra',
              count: 2,
              drops: [
                { name: 'Pride of the Heights', tier: 3, note: 'Unrefined Mysterious Metal' },
                { name: 'Acid Magma', tier: 0 },
                { name: 'Plain Drop' },
              ],
            },
          ],
        },
      },
    })
    const out = await loadWorldEventLoot(client)
    const mobs = out.Infernal.drops.rareMobDrops
    expect(mobs).toHaveLength(1)
    expect(mobs[0]).toEqual({
      name: 'Pyroclastic Hydra',
      count: 2,
      drops: [
        { name: 'Pride of the Heights', tier: 3, note: 'Unrefined Mysterious Metal' },
        { name: 'Acid Magma', tier: 0 },
        { name: 'Plain Drop' },
      ],
    })
  })

  it('coerces legacy "N× Mob" string rareMobDrops', async () => {
    const client = mockClient({
      Legacy: {
        region: 'X',
        countdown: '',
        delay: '',
        drops: { rareMobDrops: ['2× Pyroclastic Hydra', '1x Roaming Ancient', 'Bare Mob'] },
      },
    })
    const out = await loadWorldEventLoot(client)
    expect(out.Legacy.drops.rareMobDrops).toEqual([
      { name: 'Pyroclastic Hydra', count: 2, drops: [] },
      { name: 'Roaming Ancient', count: 1, drops: [] },
      { name: 'Bare Mob', count: 1, drops: [] },
    ])
  })

  it('defaults missing count to 1 and rejects malformed drop entries', async () => {
    const client = mockClient({
      Sparse: {
        region: 'X',
        countdown: '',
        delay: '',
        drops: {
          rareMobDrops: [
            { name: 'Solo Mob', drops: [{ name: 'Good' }, { tier: 3 }, null, 'string-drop'] },
          ],
        },
      },
    })
    const out = await loadWorldEventLoot(client)
    expect(out.Sparse.drops.rareMobDrops).toEqual([
      { name: 'Solo Mob', count: 1, drops: [{ name: 'Good' }] },
    ])
  })
})
