/**
 * Browser-path oracle: load EVERYTHING from CDN files (the same files the
 * browser fetches from cdn.wynn.tools), pipe through every cdn-adapter, and
 * verify computeBuild produces wynnbuilder-matching DPS for the corpus hash.
 *
 * Catches regressions where any adapter silently drops or transforms a field
 * the math depends on — e.g. dropping atree `effects` (halves DPS), stripping
 * the `static` flag from identifications (mis-rolls atkTier), etc.
 */

import type { EncodingConstants } from '../../codec/encoding-constants'
import type { AtreeData } from '../../types/atree'
import type { CdnAtreeFile } from './atree-adapter'
import type { OutputItem } from './item-adapter'
import type { CdnMajorIdEntry } from './majid-adapter'
import type { OutputTome } from './tome-adapter'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeBuild } from '../../build/compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from '../../build/resolve'
import { decodeRawBuild } from '../../codec/build-codec'
import { mergeClassAtrees } from './atree-adapter'
import { adaptCdnItem } from './item-adapter'
import { adaptCdnMajorIds } from './majid-adapter'
import { adaptCdnSets } from './sets-adapter'
import { adaptCdnTome } from './tome-adapter'

// Override with WYNN_CDN_DATA; otherwise look for the cdn repo as a sibling of
// this checkout. Test is skipped if absent.
const CDN_DATA = process.env.WYNN_CDN_DATA
  ?? resolve(process.cwd(), '..', 'cdn.wynn.tools', 'data', '2.2.0.31')
const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'
// Wynnbuilder oracle targets (melee unchanged by major IDs).
const EXPECTED_AVG_DPS = 90941.85
const EXPECTED_PER_ATTACK = 21149.27
// Totem Tick DPS with Furious Effigy (totem_mul 2.5→5, num_totems=2): 5×avg×2 = 3845.07
const EXPECTED_TOTEM_TICK_DPS = 3845.07

const CLASS_FILES: Array<[string, string]> = [
  ['Archer', 'archer'],
  ['Warrior', 'warrior'],
  ['Mage', 'mage'],
  ['Assassin', 'assassin'],
  ['Shaman', 'shaman'],
]

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

describe.skipIf(!existsSync(CDN_DATA))(
  'cdn full-pipeline oracle (Shaman relik lvl-121)',
  () => {
    it('produces the wynnbuilder DPS when every adapter runs on real CDN files', () => {
      const itemsFile = readJson<{ items: OutputItem[] }>(join(CDN_DATA, 'items.json'))
      const tomesFile = readJson<{ tomes: OutputTome[] }>(join(CDN_DATA, 'tomes.json'))
      const setsFile = readJson<Parameters<typeof adaptCdnSets>[0]>(join(CDN_DATA, 'sets.json'))
      const enc = readJson<EncodingConstants>(join(CDN_DATA, 'encoding_consts.json'))
      ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = (enc.POWDER_ELEMENTS as unknown[]).length

      const atreeFiles: Record<string, CdnAtreeFile> = {}
      for (const [cls, file] of CLASS_FILES)
        atreeFiles[cls] = readJson<CdnAtreeFile>(join(CDN_DATA, 'atree', `${file}.json`))
      const atreeData = mergeClassAtrees(atreeFiles) as AtreeData

      const adaptedItems = itemsFile.items.map(adaptCdnItem)
      const rawItemIndex = buildRawItemIndex(adaptedItems as Parameters<typeof buildRawItemIndex>[0])
      const tomeIndex = buildRawTomeIndex(tomesFile.tomes.map(adaptCdnTome))
      const sets = adaptCdnSets(setsFile)
      const majidFile = readJson<Record<string, CdnMajorIdEntry>>(join(CDN_DATA, 'majid.json'))
      const majorIdData = adaptCdnMajorIds(majidFile)

      const typeById = new Map<number, string>()
      for (const it of adaptedItems) {
        if (typeof it.id === 'number' && typeof it.type === 'string')
          typeById.set(it.id, it.type)
      }

      const rawBuild = decodeRawBuild(ORACLE_HASH, () => ({
        enc,
        atreeData,
        weaponType: (id: number) => typeById.get(id) ?? null,
        recipeIsWeapon: () => false,
      }))

      const result = computeBuild(rawBuild, { rawItemIndex, sets, atreeData, tomeIndex, aspectData: {}, majorIdData })

      expect(result.melee.averageDps).toBeCloseTo(EXPECTED_AVG_DPS, 1)
      expect(result.melee.perAttack).toBeCloseTo(EXPECTED_PER_ATTACK, 1)

      // Totem Tick DPS — display part of spell 1, should match WynnBuilder with Furious Effigy
      const totemSpell = result.spells.find(s => s.spell.baseSpell === 1)
      const tickDps = totemSpell?.parts.find(p => p.name === 'Tick DPS' && p.type === 'damage')
      if (tickDps && tickDps.type === 'damage') {
        const crit = 0.563
        const nonCrit = (tickDps.normalTotal[0] + tickDps.normalTotal[1]) / 2
        const critAvg = (tickDps.critTotal[0] + tickDps.critTotal[1]) / 2
        const avg = (1 - crit) * nonCrit + crit * critAvg
        expect(avg).toBeCloseTo(EXPECTED_TOTEM_TICK_DPS, 0)
      }
    })
  },
)
