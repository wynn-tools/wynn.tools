/**
 * End-to-end oracle for an air-conversion Mage build (Warp wand, lvl 120).
 *
 * Loads everything from the real CDN files (same path the browser uses) and
 * verifies computeBuild matches WynnBuilder for a build that exercises powder
 * neutral→element conversion. This is the build that surfaced the neutral
 * powder-conversion bug: WynnBuilder writes the *reduced* neutral back to the
 * weapon (powders.js:256 `damages[0] = neutralRemainingRaw`); a port that keeps
 * the full neutral inflates every damage number that reads the weapon — melee
 * (direct neutral multiplier) and spells (via the conversion base `weapon_min`).
 *
 * It also exercises Seance (`+1% Spell Damage per 5 Lifesteal, max 50%`), a
 * non-slider `stat_scaling` effect: with 914 lifesteal it caps at +50% sdPct,
 * which every spell number depends on. A port that drops stat_scaling leaves
 * spells ~18% low (melee, which scales off Md not Sd, is unaffected).
 *
 * Oracle hash: CU0NdAwyf155BwaFfe3iHG0noH23WmcYSA+F8euVPWM2nxzyqFh-d1
 *
 * All anchors are read directly from WynnBuilder's display for this hash.
 *
 * Follows the skip-if-absent pattern so the suite stays green without the CDN
 * checkout.
 */

import type { EncodingConstants } from '../codec/encoding-constants'
import type { CdnAtreeFile } from '../data/cdn-adapter/atree-adapter'
import type { OutputItem } from '../data/cdn-adapter/item-adapter'
import type { CdnMajorIdEntry } from '../data/cdn-adapter/majid-adapter'
import type { OutputTome } from '../data/cdn-adapter/tome-adapter'
import type { AtreeData } from '../types/atree'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decodeRawBuild } from '../codec/build-codec'
import { mergeClassAtrees } from '../data/cdn-adapter/atree-adapter'
import { adaptCdnItem } from '../data/cdn-adapter/item-adapter'
import { adaptCdnMajorIds } from '../data/cdn-adapter/majid-adapter'
import { adaptCdnSets } from '../data/cdn-adapter/sets-adapter'
import { adaptCdnTome } from '../data/cdn-adapter/tome-adapter'
import { critChance } from '../math/dps'
import { computeBuild } from './compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from './resolve'

const CDN_DATA = process.env.WYNN_CDN_DATA
  ?? resolve(process.cwd(), '..', 'cdn.wynn.tools', 'data', '2.2.0.31')
const ORACLE_HASH = 'CU0NdAwyf155BwaFfe3iHG0noH23WmcYSA+F8euVPWM2nxzyqFh-d1'

const EXPECTED = {
  totalHp: 13811,
  // Melee — read from WynnBuilder display (Pyrokinesis, VERY_FAST ×3.1).
  meleePerAttack: 1844.88,
  meleeNonCritAvg: 1241.20,
  meleeCritAvg: 2482.40,
  meleeDpsAvg: 5718.12,
  // Spell display-part crit-weighted averages (dex 65 → crit 48.6%), read from WB.
  spells: [
    { baseSpell: 2, name: 'Total Damage', avg: 6654.18 }, // Teleport / Etheric Slash
    { baseSpell: 3, name: 'Meteor Damage', avg: 18620.15 }, // Meteor — direct hit
    { baseSpell: 3, name: 'Lightning Damage', avg: 8495.65 }, // Meteor — Thunderstorm
    { baseSpell: 3, name: 'Total Damage', avg: 27115.80 }, // Meteor — combined
    { baseSpell: 4, name: 'Ice Snake Damage', avg: 8263.02 }, // Ice Snake
    { baseSpell: 6, name: 'DPS', avg: 3011.48 }, // Burning Sigil
    { baseSpell: 10, name: 'Total Damage', avg: 1269.79 }, // Judrajim
  ] as Array<{ baseSpell: number, name: string, avg: number }>,
}

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

describe.skipIf(!existsSync(CDN_DATA))('cdn full-pipeline oracle (air Mage lvl-120)', () => {
  it('matches WynnBuilder melee + spell datapoints', () => {
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
    const crit = critChance(result.stats)

    // --- HP ---
    expect(result.defense.totalHp).toBe(EXPECTED.totalHp)

    // --- Melee (pure neutral multiplier → fully converted to air by powders) ---
    const meleeSpell = result.spells.find(s => s.spell.baseSpell === 0)
    const melee = meleeSpell?.parts.find(p => p.type === 'damage' && p.name === 'Melee')
    expect(melee, 'melee part').toBeDefined()
    if (melee && melee.type === 'damage') {
      const nc = (melee.normalTotal[0] + melee.normalTotal[1]) / 2
      const cr = (melee.critTotal[0] + melee.critTotal[1]) / 2
      expect(nc, 'melee non-crit avg').toBeCloseTo(EXPECTED.meleeNonCritAvg, 1)
      expect(cr, 'melee crit avg').toBeCloseTo(EXPECTED.meleeCritAvg, 1)
    }
    expect(result.melee.perAttack, 'melee per-attack').toBeCloseTo(EXPECTED.meleePerAttack, 1)
    // DPS within display rounding (per-attack × 3.1 VERY_FAST).
    expect(result.melee.averageDps, 'melee dps').toBeCloseTo(EXPECTED.meleeDpsAvg, -1)

    // --- Seance stat_scaling: 914 lifesteal → +50% spell damage (capped) ---
    expect(result.stats.get('sdPct'), 'Seance sdPct').toBe(50)

    // --- Spells (conversion base reads the reduced-neutral weapon; sdPct from Seance) ---
    for (const oracle of EXPECTED.spells) {
      const spellOut = result.spells.find(s => s.spell.baseSpell === oracle.baseSpell)
      const part = spellOut?.parts.find(p => p.type === 'damage' && p.name === oracle.name)
      expect(part, `spell ${oracle.baseSpell} (${oracle.name})`).toBeDefined()
      if (part && part.type === 'damage') {
        const nc = (part.normalTotal[0] + part.normalTotal[1]) / 2
        const cr = (part.critTotal[0] + part.critTotal[1]) / 2
        const avg = (1 - crit) * nc + crit * cr
        expect(avg, `spell ${oracle.baseSpell} (${oracle.name}) avg`).toBeCloseTo(oracle.avg, 1)
      }
    }
  })
})
