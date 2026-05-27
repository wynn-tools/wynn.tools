import { describe, expect, it } from 'vitest'
import versions from '~/lib/data/__fixtures__/cdn/versions.json'
import { loadBuildContext, peekVersionId } from './useBuildData'

// versionId 30 → game version '2.2.0.31' → content hash '7a3e636e' (via versions.json offset)
const VERSION_ID_2_2_0_31 = 30
const HASH = '7a3e636e'

function mockClient(files: Record<string, unknown>) {
  return {
    fetchJson: async <T>(path: string) => files[path] as T,
  }
}

const fixtures = {
  'versions.json': versions,
  [`${HASH}/items.json`]: {
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
  [`${HASH}/atree.json`]: { Shaman: [] },
  [`${HASH}/encoding_consts.json`]: { POWDER_ELEMENTS: [] },
  [`${HASH}/tomes.json`]: { tomes: [{ name: 'T', id: 5, type: 'weaponTome', mdPct: 8 }] },
  [`${HASH}/aspects.json`]: {},
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

    // tomeIndex resolves the fixture tome by id
    expect(data.ctx.tomeIndex.resolveId(5)).not.toBeNull()

    // aspectData is present
    expect(data.ctx.aspectData).toBeDefined()
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
