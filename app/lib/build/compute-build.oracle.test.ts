/**
 * End-to-end oracle test for computeBuild.
 *
 * Validates the full pipeline against the live-site (wynnbuilder-beta) oracle
 * for the Shaman relik lvl-121 corpus build.
 *
 * Oracle (CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0):
 *   Total HP      11710
 *   EHP w/ agi    17171.41
 *   EHP no agi    8583.46
 *   Melee avg DPS 90941.85
 *   Per-attack    21149.27
 *
 * Follows the exact skip-if-absent pattern from real-roundtrip.test.ts so the
 * suite stays green when the beta checkout is not present.
 */

import type { EncodingConstants } from '../codec/encoding-constants'
import type { CdnMajorIdEntry } from '../data/cdn-adapter/majid-adapter'
import type { AtreeData } from '../types/atree'
import type { ItemSet } from '../types/item'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BitVector, BitVectorCursor } from '../codec/bit-vector'
import { decodeRawBuild } from '../codec/build-codec'
import { decodeHeader } from '../codec/header'
import { adaptCdnMajorIds } from '../data/cdn-adapter/majid-adapter'
import { computeBuild } from './compute-build'
import { buildRawItemIndex } from './resolve'

// ---------------------------------------------------------------------------
// Path to the beta checkout. Override with WYNN_BETA_DATA; otherwise look for
// the repo as a sibling of this checkout. Test is skipped if absent.
// ---------------------------------------------------------------------------

const BETA_DATA = process.env.WYNN_BETA_DATA
  ?? resolve(process.cwd(), '..', 'wynnbuilder-beta.github.io', 'data')

// ---------------------------------------------------------------------------
// Corpus hash + expected oracle values
// ---------------------------------------------------------------------------

const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

const EXPECTED = {
  totalHp: 11710,
  ehpWithAgi: 17171.41,
  ehpNoAgi: 8583.46,
  meleeDpsAvg: 90941.85,
  meleePerAttack: 21149.27,
  // Spell display-part averages from WynnBuilder (crit=56.3%, same build)
  spells: {
    1: { name: 'Tick DPS', avg: 3845.07 }, // Totem — Furious Effigy doubles totem_mul
    3: { name: 'First Wave', avg: 13372.79 }, // Aura
    8: { name: 'Totem Drain DPS', avg: 90435.05 }, // Twisted Tether
    9: { name: 'Bleed DPS', avg: 12081.24 }, // Bleeding
    10: { name: 'Beam DPS', avg: 28879.89 }, // Blood Sorrow
    11: { name: 'DPS', avg: 20332.31 }, // Eldritch Call
  } as Record<number, { name: string, avg: number | null }>,
}

// ---------------------------------------------------------------------------
// Helper: peek at version id from hash (same as round-trip test)
// ---------------------------------------------------------------------------

function _peekVersion(hash: string): number {
  const vec = new BitVector(hash, hash.length * 6)
  return decodeHeader(new BitVectorCursor(vec))
}

// ---------------------------------------------------------------------------
// Guard — skip when beta data is absent
// ---------------------------------------------------------------------------

const haveData = existsSync(BETA_DATA)

describe.skipIf(!haveData)('compute-build oracle (Shaman relik lvl-121)', () => {
  it('matches all five oracle metrics', { timeout: 30000 }, () => {
    // -----------------------------------------------------------------------
    // 1. Load version data (same pattern as real-roundtrip.test.ts)
    // -----------------------------------------------------------------------
    const versionName = '2.2.0.31'
    const dir = join(BETA_DATA, versionName)

    const enc = JSON.parse(readFileSync(join(dir, 'encoding_consts.json'), 'utf8')) as EncodingConstants
    // Patch POWDER_ELEMENTS_COUNT as the round-trip test does
    const elements = enc.POWDER_ELEMENTS as unknown as unknown[]
    ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = elements.length

    const atreeData = JSON.parse(readFileSync(join(dir, 'atree.json'), 'utf8')) as AtreeData

    const rawItemsFile = JSON.parse(
      readFileSync(join(dir, 'items.json'), 'utf8'),
    ) as { items: Array<Record<string, unknown> & { id?: number, type?: string }>, sets: Record<string, ItemSet> }

    const majidFile = JSON.parse(readFileSync(join(dir, 'majid.json'), 'utf8')) as Record<string, CdnMajorIdEntry>
    const majorIdData = adaptCdnMajorIds(majidFile)

    // Build item-type lookup for the DecodeProvider
    const itemTypeById = new Map<number, string>()
    for (const it of rawItemsFile.items) {
      if (typeof it.id === 'number' && typeof it.type === 'string') {
        itemTypeById.set(it.id, it.type)
      }
    }

    // -----------------------------------------------------------------------
    // 2. Decode the corpus hash
    // -----------------------------------------------------------------------
    const provider = (_v: number) => ({
      enc,
      atreeData,
      weaponType: (id: number) => itemTypeById.get(id) ?? null,
      recipeIsWeapon: () => false,
    })

    const rawBuild = decodeRawBuild(ORACLE_HASH, provider)

    // -----------------------------------------------------------------------
    // 3. Build context
    // -----------------------------------------------------------------------
    const rawItemIndex = buildRawItemIndex(rawItemsFile.items as Parameters<typeof buildRawItemIndex>[0])

    const sets = new Map<string, ItemSet>(
      Object.entries(rawItemsFile.sets),
    )

    const ctx = { rawItemIndex, sets, atreeData, majorIdData }

    // -----------------------------------------------------------------------
    // 4. Run the orchestrator
    // -----------------------------------------------------------------------
    const result = computeBuild(rawBuild, ctx)

    const { totalHp, ehp } = result.defense
    const { averageDps, perAttack } = result.melee

    // Helper: crit-weighted average of a damage part using build's dex crit chance
    const critChance = 0.563
    function partAvg(part: { type: string, normalTotal?: [number, number], critTotal?: [number, number] }): number {
      if (part.type !== 'damage' || !part.normalTotal || !part.critTotal)
        return 0
      const nc = (part.normalTotal[0] + part.normalTotal[1]) / 2 || 0
      const c = (part.critTotal[0] + part.critTotal[1]) / 2 || 0
      return (1 - critChance) * nc + critChance * c || 0
    }

    // -----------------------------------------------------------------------
    // 5. Log computed vs expected so any gap is legible
    // -----------------------------------------------------------------------
    console.warn('\n=== Oracle vs Computed ===')
    console.warn(`Total HP       expected: ${EXPECTED.totalHp}        computed: ${totalHp}`)
    console.warn(`EHP w/ agi     expected: ${EXPECTED.ehpWithAgi}   computed: ${ehp.withAgi.toFixed(2)}`)
    console.warn(`EHP no agi     expected: ${EXPECTED.ehpNoAgi}    computed: ${ehp.withoutAgi.toFixed(2)}`)
    console.warn(`Melee avg DPS  expected: ${EXPECTED.meleeDpsAvg} computed: ${averageDps.toFixed(2)}`)
    console.warn(`Per-attack     expected: ${EXPECTED.meleePerAttack} computed: ${perAttack.toFixed(2)}`)
    for (const [baseSpell, oracle] of Object.entries(EXPECTED.spells)) {
      const spellOut = result.spells.find(s => s.spell.baseSpell === Number(baseSpell))
      const displayPart = spellOut?.parts.find(p => p.name === oracle.name)
      const computed = displayPart ? partAvg(displayPart) : null
      console.warn(`Spell ${baseSpell} (${oracle.name.padEnd(16)}) expected: ${oracle.avg?.toFixed(2) ?? 'n/a'} computed: ${computed?.toFixed(2) ?? 'missing'}`)
    }
    console.warn('=========================\n')

    // -----------------------------------------------------------------------
    // 6. Assertions
    // -----------------------------------------------------------------------

    expect(totalHp).toBe(EXPECTED.totalHp)
    expect(ehp.withAgi).toBeCloseTo(EXPECTED.ehpWithAgi, 1)
    expect(ehp.withoutAgi).toBeCloseTo(EXPECTED.ehpNoAgi, 1)
    expect(averageDps).toBeCloseTo(EXPECTED.meleeDpsAvg, 1)
    expect(perAttack).toBeCloseTo(EXPECTED.meleePerAttack, 1)

    // Skillpoint oracle: relik build at lvl 121 with sp auto → assignedTotal === 170
    expect(result.skillpoints.assignedTotal).toBe(170)

    // Spell display-part averages
    for (const [baseSpell, oracle] of Object.entries(EXPECTED.spells)) {
      if (oracle.avg === null)
        continue
      const spellOut = result.spells.find(s => s.spell.baseSpell === Number(baseSpell))
      const displayPart = spellOut?.parts.find(p => p.name === oracle.name)
      expect(displayPart, `spell ${baseSpell} (${oracle.name}) not found in result.spells`).toBeDefined()
      if (displayPart)
        expect(partAvg(displayPart), `spell ${baseSpell} (${oracle.name})`).toBeCloseTo(oracle.avg, -2)
    }
  })
})
