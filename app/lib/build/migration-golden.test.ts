import type { RawBuild } from '~/lib/codec/build-codec'
import { describe, expect, it } from 'vitest'
import { loadBuildContext, resolveLatestVersionId } from '~/composables/useBuildData'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { computeBuild } from '~/lib/build/compute-build'
import { POWDER_INDEX_BY_SLOT } from '~/lib/build/resolve'
import { decodeRawBuild, encodeRawBuild } from '~/lib/codec/build-codec'
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

/**
 * End-to-end golden regression for the CDN migration. Builds are constructed
 * from the new-schema fixtures (run through the adapters by loadBuildContext),
 * encoded, decoded, and computed. This proves the full adapter → codec → math
 * chain is internally consistent and stable:
 *  - encode → decode round-trips byte-faithfully (decoded deep-equals input),
 *  - computeBuild output is locked by snapshot.
 *
 * Note: this is a same-snapshot regression net, not a cross-game-version
 * comparison — the codec and math layers are unchanged by the migration
 * (proven by their own suites); this test guards the adapter wiring.
 */

const HASH = '2.2.0.31' // newest version-tagged snapshot in the fixture versions.json

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

const client = {
  fetchJson: async <T>(path: string) => {
    if (!(path in fixtures))
      throw new Error(`unexpected fetch: ${path}`)
    return fixtures[path] as T
  },
}

function emptyPowders(): number[][] {
  return Array.from({ length: POWDER_INDEX_BY_SLOT.size }, () => [])
}

describe('migration golden regression', () => {
  it('round-trips and computes an archer bow build against the adapted schema', async () => {
    const versionId = await resolveLatestVersionId(client)
    const { ctx, enc, weaponType } = await loadBuildContext(client, versionId)

    // Deadeye (id 19) is a bow → Archer; allocate the two root-most archer nodes.
    const raw: RawBuild = {
      versionId,
      equipment: [
        { kind: 'normal', id: null },
        { kind: 'normal', id: 0 },
        { kind: 'normal', id: 3 },
        { kind: 'normal', id: null },
        { kind: 'normal', id: 5 },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: null },
        { kind: 'normal', id: 19 },
      ], // chestplate, leggings, ring, bow
      powders: emptyPowders(),
      tomeIds: Array.from({ length: 14 }).fill(null),
      sp: null,
      level: 106,
      aspects: Array.from({ length: 5 }).fill(null),
      activeAtree: [0, 1], // Arrow Bomb (root) + Bow Proficiency
    }

    const sortedTree = getSortedClassAtree(ctx.atreeData, 'Archer')
    const hash = encodeRawBuild(raw, enc, sortedTree)
    const decoded = decodeRawBuild(hash, () => ({ enc, atreeData: ctx.atreeData, weaponType, recipeIsWeapon: () => false }))

    // Round-trip: decode reproduces the encoded build exactly.
    expect(decoded).toEqual(raw)

    const result = computeBuild(decoded, ctx)
    const golden = {
      totalHp: result.defense.totalHp,
      ehp: result.defense.ehp,
      totalHpr: result.defense.totalHpr,
      elementalDefenses: result.defense.elementalDefenses,
      meleePerAttack: result.melee.perAttack,
      meleeAverageDps: result.melee.averageDps,
      attackSpeed: result.melee.attackSpeed,
      finalSkillpoints: result.skillpoints.finalSkillpoints,
    }
    expect(golden).toMatchSnapshot()
  })
})
