import { describe, expect, it } from 'vitest'
import { loadBuildContext, peekVersionId } from './useBuildData'

// '2.2.0.31' is at index 30 in WYNN_VERSION_NAMES
const VERSION_ID_2_2_0_31 = 30

function mockClient(files: Record<string, unknown>) {
  return {
    fetchJson: async <T>(path: string) => files[path] as T,
  }
}

const fixtures = {
  '2.2.0.31/items.json': {
    items: [
      {
        name: 'R',
        id: 5,
        type: 'relik',
        nDam: '10-20',
        category: 'weapon',
        slots: 0,
      },
    ],
    sets: {},
  },
  '2.2.0.31/atree.json': { Shaman: [] },
  '2.2.0.31/encoding_consts.json': { POWDER_ELEMENTS: [] },
}

describe('peekVersionId', () => {
  it('returns the version id encoded in the oracle hash', () => {
    const versionId = peekVersionId('CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0')
    expect(typeof versionId).toBe('number')
    expect(versionId).toBe(VERSION_ID_2_2_0_31)
  })
})

describe('loadBuildContext', () => {
  it('wires items into rawItemIndex, sets, atreeData, and weaponType', async () => {
    const client = mockClient(fixtures)
    const data = await loadBuildContext(client, VERSION_ID_2_2_0_31)

    // rawItemIndex resolves item id 5
    expect(data.ctx.rawItemIndex.resolveId(5)).toBeDefined()
    expect(data.ctx.rawItemIndex.resolveId(5)?.id).toBe(5)

    // weaponType returns 'relik' for id 5
    expect(data.weaponType(5)).toBe('relik')

    // atreeData.Shaman is defined
    expect(data.ctx.atreeData.Shaman).toBeDefined()

    // enc.POWDER_ELEMENTS_COUNT patched to POWDER_ELEMENTS.length (0)
    expect((data.enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT).toBe(0)
  })

  it('caches results per versionId (same data returned without re-fetching)', async () => {
    // The cache is module-level; after the first test, version 30 is already cached.
    // A second call must return the same resolved data without making new fetchJson calls.
    const calls: string[] = []
    const trackingClient = {
      fetchJson: async <T>(path: string) => {
        calls.push(path)
        return (fixtures as Record<string, unknown>)[path] as T
      },
    }

    // First call — hits cache (populated by previous test), no fetchJson calls made.
    const callsBefore = calls.length
    await loadBuildContext(trackingClient, VERSION_ID_2_2_0_31)
    expect(calls.length).toBe(callsBefore) // no new network calls — cache hit
  })
})
