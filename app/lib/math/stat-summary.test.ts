/**
 * Verifies the stat ledger against WynnBuilder's Detailed view for the air-Mage
 * oracle build (hash CU0NdAwyf155BwaFfe3iHG0noH23WmcYSA+F8euVPWM2nxzyqFh-d1).
 * Loads from the real CDN files; skipped when the checkout is absent.
 */
import type { EncodingConstants } from '../codec/encoding-constants'
import type { CdnAtreeFile } from '../data/cdn-adapter/atree-adapter'
import type { OutputItem } from '../data/cdn-adapter/item-adapter'
import type { CdnMajorIdEntry } from '../data/cdn-adapter/majid-adapter'
import type { OutputTome } from '../data/cdn-adapter/tome-adapter'
import type { AtreeData } from '../types/atree'
import type { StatLine } from './stat-summary'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeBuild } from '../build/compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from '../build/resolve'
import { decodeRawBuild } from '../codec/build-codec'
import { mergeClassAtrees } from '../data/cdn-adapter/atree-adapter'
import { adaptCdnItem } from '../data/cdn-adapter/item-adapter'
import { adaptCdnMajorIds } from '../data/cdn-adapter/majid-adapter'
import { adaptCdnSets } from '../data/cdn-adapter/sets-adapter'
import { adaptCdnTome } from '../data/cdn-adapter/tome-adapter'
import { buildStatSummary } from './stat-summary'

const CDN_DATA = process.env.WYNN_CDN_DATA
  ?? resolve(process.cwd(), '..', 'cdn.wynn.tools', 'data', '2.2.0.31')
const HASH = 'CU0NdAwyf155BwaFfe3iHG0noH23WmcYSA+F8euVPWM2nxzyqFh-d1'

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

describe.skipIf(!existsSync(CDN_DATA))('buildStatSummary (air-Mage oracle)', () => {
  function compute() {
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
    const majorIdData = adaptCdnMajorIds(readJson<Record<string, CdnMajorIdEntry>>(join(CDN_DATA, 'majid.json')))

    const typeById = new Map<number, string>()
    for (const it of adaptedItems) {
      if (typeof it.id === 'number' && typeof it.type === 'string')
        typeById.set(it.id, it.type)
    }

    const rawBuild = decodeRawBuild(HASH, () => ({
      enc,
      atreeData,
      weaponType: (id: number) => typeById.get(id) ?? null,
      recipeIsWeapon: () => false,
    }))
    return computeBuild(rawBuild, { rawItemIndex, sets, atreeData, tomeIndex, aspectData: {}, majorIdData })
  }

  function flatten(groups: ReturnType<typeof buildStatSummary>): Map<string, string> {
    const m = new Map<string, string>()
    for (const g of groups) {
      for (const line of g.lines as StatLine[]) m.set(line.label, line.value)
    }
    return m
  }

  it('matches WynnBuilder Detailed rows', () => {
    const rows = flatten(buildStatSummary(compute(), 'detailed'))
    const expected: Record<string, string> = {
      'Total HP': '13,811.00',
      'Effective HP': '50,358.16',
      'Effective HP (no agi)': '17,585.53',
      'HP Regen (Final)': '-32.00',
      'Effective HP Regen': '-116.68',
      'Earth Def': '-200.00',
      'Thunder Def': '437.50',
      'Water Def': '-214.00',
      'Fire Def': '340.00',
      'Air Def': '1,097.50',
      'Mana Regen': '-14/5s',
      '➜ Total with base': '11/5s',
      'Mana Steal': '16/3s',
      '➜ Mana per hit': '1.7',
      'Total Mana': '100',
      'Raw Health Regen': '-16',
      'Health Regen %': '-100%',
      'Heal Effectiveness %': '-21%',
      'Life Steal': '914/3s',
      '➜ Effective LS': '3,333/3s',
      '➜ Life per hit': '98',
      'Spell Damage %': '50%',
      'Air Spell Damage Raw': '208',
      'Air Damage Raw': '85',
      'Thunder Damage %': '46%',
      'Fire Damage %': '10%',
      'Air Damage %': '59%',
      'Thunder Defense %': '25%',
      'Water Defense %': '-7%',
      'Fire Defense %': '25%',
      'Air Defense %': '25%',
      '1st Spell Cost %': '-8%',
      '2nd Spell Cost Raw': '-389',
      '3rd Spell Cost %': '-49%',
      'Reflection': '117%',
      'Exploding': '65%',
      'Walk Speed Bonus': '272%',
      'Sprint Bonus': '35%',
      'Jump Height': '1',
      'Combat XP Bonus': '20%',
      'Loot Bonus': '245%',
    }
    for (const [label, value] of Object.entries(expected))
      expect(rows.get(label), label).toBe(value)
  })

  it('summary omits detailed-only rows', () => {
    const summary = flatten(buildStatSummary(compute(), 'summary'))
    // present in summary
    expect(summary.get('Total HP')).toBe('13,811.00')
    expect(summary.get('Life Steal')).toBe('914/3s')
    expect(summary.get('Loot Bonus')).toBe('245%')
    // detailed-only — absent from summary
    expect(summary.has('Effective HP Regen')).toBe(false)
    expect(summary.has('Spell Damage %')).toBe(false)
    expect(summary.has('1st Spell Cost %')).toBe(false)
    expect(summary.has('Sprint Bonus')).toBe(false)
  })
})
