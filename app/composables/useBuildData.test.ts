import { describe, expect, it } from 'vitest'
import archerAspects from '~/lib/data/__fixtures__/cdn/aspects/archer.json'
import assassinAspects from '~/lib/data/__fixtures__/cdn/aspects/assassin.json'
import mageAspects from '~/lib/data/__fixtures__/cdn/aspects/mage.json'
import shamanAspects from '~/lib/data/__fixtures__/cdn/aspects/shaman.json'
import warriorAspects from '~/lib/data/__fixtures__/cdn/aspects/warrior.json'
import archerAtree from '~/lib/data/__fixtures__/cdn/atree/archer.json'
import assassinAtree from '~/lib/data/__fixtures__/cdn/atree/assassin.json'
import mageAtree from '~/lib/data/__fixtures__/cdn/atree/mage.json'
import shamanAtree from '~/lib/data/__fixtures__/cdn/atree/shaman.json'
import warriorAtree from '~/lib/data/__fixtures__/cdn/atree/warrior.json'
import encodingConsts from '~/lib/data/__fixtures__/cdn/encoding_consts.json'
import itemsFile from '~/lib/data/__fixtures__/cdn/items.json'
import setsFile from '~/lib/data/__fixtures__/cdn/sets.json'
import tomesFile from '~/lib/data/__fixtures__/cdn/tomes.json'
import versions from '~/lib/data/__fixtures__/cdn/versions.json'
import { loadBuildContext, peekVersionId } from './useBuildData'

// versionId 30 → game version '2.2.0.31' → content hash '7a3e636e' (via versions.json offset)
const VERSION_ID_2_2_0_31 = 30
const HASH = '7a3e636e'

const fixtures: Record<string, unknown> = {
  'versions.json': versions,
  [`data/${HASH}/items.json`]: itemsFile,
  [`data/${HASH}/tomes.json`]: tomesFile,
  [`data/${HASH}/sets.json`]: setsFile,
  [`data/${HASH}/encoding_consts.json`]: encodingConsts,
  [`data/${HASH}/atree/archer.json`]: archerAtree,
  [`data/${HASH}/atree/warrior.json`]: warriorAtree,
  [`data/${HASH}/atree/mage.json`]: mageAtree,
  [`data/${HASH}/atree/assassin.json`]: assassinAtree,
  [`data/${HASH}/atree/shaman.json`]: shamanAtree,
  [`data/${HASH}/aspects/archer.json`]: archerAspects,
  [`data/${HASH}/aspects/warrior.json`]: warriorAspects,
  [`data/${HASH}/aspects/mage.json`]: mageAspects,
  [`data/${HASH}/aspects/assassin.json`]: assassinAspects,
  [`data/${HASH}/aspects/shaman.json`]: shamanAspects,
}

function mockClient(files: Record<string, unknown> = fixtures) {
  return {
    fetchJson: async <T>(path: string) => {
      if (!(path in files))
        throw new Error(`unexpected fetch: ${path}`)
      return files[path] as T
    },
  }
}

describe('peekVersionId', () => {
  it('returns the version id encoded in the oracle hash', () => {
    const versionId = peekVersionId('CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0')
    expect(versionId).toBe(VERSION_ID_2_2_0_31)
  })
})

describe('loadBuildContext (new CDN schema via adapters)', () => {
  it('adapts items, tomes, sets, per-class atree and aspects', async () => {
    const data = await loadBuildContext(mockClient(), VERSION_ID_2_2_0_31)

    // items adapted + indexed: id 0 (Dondasch) resolves and carries shorthand stats
    const dondasch = data.ctx.rawItemIndex.resolveId(0)
    expect(dondasch).toBeDefined()
    expect(dondasch?.category).toBe('armor') // armour → armor

    // weaponType resolves a weapon's subType (Eidolon id 1 is a wand)
    expect(data.weaponType(1)).toBe('wand')

    // sets from the standalone sets.json, keyed by name
    expect(data.ctx.sets.has('Adventurer')).toBe(true)

    // per-class atree merged with WynnClass casing, single root reachable
    expect(data.ctx.atreeData.Archer?.length).toBeGreaterThan(0)
    expect(data.ctx.atreeData.Warrior?.length).toBeGreaterThan(0)

    // per-class aspects merged
    expect(data.ctx.aspectData.Archer?.length).toBeGreaterThan(0)

    // tomes adapted + indexed
    expect(data.ctx.tomeIndex.byId.size).toBeGreaterThan(0)

    // encoding constants patched
    expect((data.enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT)
      .toBe((encodingConsts as { POWDER_ELEMENTS: unknown[] }).POWDER_ELEMENTS.length)
  })

  it('tolerates a historical snapshot with no sets.json (empty sets)', async () => {
    // versionId 9 → game version 2.1.0.1 → hash e4872d66 (a backfilled snapshot).
    const HIST = 'e4872d66'
    const histFiles: Record<string, unknown> = {
      'versions.json': versions,
      [`data/${HIST}/items.json`]: itemsFile,
      [`data/${HIST}/tomes.json`]: tomesFile,
      [`data/${HIST}/encoding_consts.json`]: encodingConsts,
      [`data/${HIST}/atree/archer.json`]: archerAtree,
      [`data/${HIST}/atree/warrior.json`]: warriorAtree,
      [`data/${HIST}/atree/mage.json`]: mageAtree,
      [`data/${HIST}/atree/assassin.json`]: assassinAtree,
      [`data/${HIST}/atree/shaman.json`]: shamanAtree,
      [`data/${HIST}/aspects/archer.json`]: archerAspects,
      [`data/${HIST}/aspects/warrior.json`]: warriorAspects,
      [`data/${HIST}/aspects/mage.json`]: mageAspects,
      [`data/${HIST}/aspects/assassin.json`]: assassinAspects,
      [`data/${HIST}/aspects/shaman.json`]: shamanAspects,
      // No sets.json → fetch throws (SPA HTML fallback in production).
    }
    const client = {
      fetchJson: async <T>(path: string) => {
        if (!(path in histFiles))
          throw new SyntaxError(`Unexpected token '<' (404 HTML for ${path})`)
        return histFiles[path] as T
      },
    }
    const data = await loadBuildContext(client, 9)
    expect(data.ctx.sets.size).toBe(0)
    expect(data.ctx.atreeData.Archer?.length).toBeGreaterThan(0)
  })

  it('caches results per versionId (no re-fetch on second call)', async () => {
    const calls: string[] = []
    const tracking = {
      fetchJson: async <T>(path: string) => {
        calls.push(path)
        return fixtures[path] as T
      },
    }
    const before = calls.length
    await loadBuildContext(tracking, VERSION_ID_2_2_0_31)
    expect(calls.length).toBe(before) // cache hit from previous test
  })
})
