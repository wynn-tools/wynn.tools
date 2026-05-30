/**
 * Oracle: aspect tier abilities (+orbs) must feed the spell math.
 *
 * Mage Light Bender build (hash below) runs "Light Bender's Embodiment of
 * Celestial Brilliance" (aspect id 15) at max tier, granting Ophanim +1 orb and
 * Lightweaver +3 orbs. Without applying aspects, num_orbs is 6/5 and the orbit
 * DPS comes out too low; with them it is 7/8, matching wynndata to the decimal.
 *
 * Reads the same CDN files the browser fetches, through every adapter. Skipped
 * when the sibling cdn.wynn.tools checkout is absent.
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
import { adaptCdnAspects } from '../data/cdn-adapter/aspect-adapter'
import { mergeClassAtrees } from '../data/cdn-adapter/atree-adapter'
import { adaptCdnItem } from '../data/cdn-adapter/item-adapter'
import { adaptCdnMajorIds } from '../data/cdn-adapter/majid-adapter'
import { adaptCdnSets } from '../data/cdn-adapter/sets-adapter'
import { adaptCdnTome } from '../data/cdn-adapter/tome-adapter'
import { computeBuild } from './compute-build'
import { buildRawItemIndex, buildRawTomeIndex } from './resolve'

const CDN_DATA = process.env.WYNN_CDN_DATA
  ?? resolve(process.cwd(), '..', 'cdn.wynn.tools', 'data', '2.2.0.31')
const HASH = 'CU0g2BAEtCJ9TE9cIUQ1bIwOw4JdqwaHSC+C5N-im1VEn+v5-Qgh7Q0'

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

function partAvg(part: { normalTotal?: [number, number], critTotal?: [number, number] }): { nc: number, cr: number } {
  const nc = ((part.normalTotal?.[0] ?? 0) + (part.normalTotal?.[1] ?? 0)) / 2
  const cr = ((part.critTotal?.[0] ?? 0) + (part.critTotal?.[1] ?? 0)) / 2
  return { nc, cr }
}

describe.skipIf(!existsSync(CDN_DATA))('aspect +orbs oracle (Mage Light Bender)', () => {
  it('applies aspect tier num_orbs so orbit DPS matches wynndata', () => {
    const itemsFile = readJson<{ items: OutputItem[] }>(join(CDN_DATA, 'items.json'))
    const tomesFile = readJson<{ tomes: OutputTome[] }>(join(CDN_DATA, 'tomes.json'))
    const setsFile = readJson<Parameters<typeof adaptCdnSets>[0]>(join(CDN_DATA, 'sets.json'))
    const enc = readJson<EncodingConstants>(join(CDN_DATA, 'encoding_consts.json'))
    ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = (enc.POWDER_ELEMENTS as unknown[]).length

    const atreeFiles: Record<string, CdnAtreeFile> = {}
    for (const [cls, file] of CLASS_FILES)
      atreeFiles[cls] = readJson<CdnAtreeFile>(join(CDN_DATA, 'atree', `${file}.json`))
    const atreeData = mergeClassAtrees(atreeFiles) as AtreeData

    const aspectData: Record<string, ReturnType<typeof adaptCdnAspects>> = {}
    for (const [cls, file] of CLASS_FILES) {
      const p = join(CDN_DATA, 'aspects', `${file}.json`)
      if (existsSync(p))
        aspectData[cls] = adaptCdnAspects(readJson(p))
    }

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

    const result = computeBuild(rawBuild, { rawItemIndex, sets, atreeData, tomeIndex, aspectData, majorIdData })

    const ophanim = result.spells.find(s => s.spell.baseSpell === 3)
    const lightweaver = result.spells.find(s => s.spell.baseSpell === 5)
    expect(ophanim, 'Ophanim spell present').toBeDefined()
    expect(lightweaver, 'Lightweaver spell present').toBeDefined()

    const ophMax = ophanim!.parts.find(p => p.name === 'Maximum Orb DPS')
    const lwMax = lightweaver!.parts.find(p => p.name === 'Maximum Orb DPS')
    // num_orbs is encoded in the neutral multiplier: Ophanim Per Orb 350 × 7 = 2450,
    // Lightweaver Single Orb 120 × 8 = 960.
    expect((ophMax as { multipliers?: number[] }).multipliers?.[0]).toBe(2450)
    expect((lwMax as { multipliers?: number[] }).multipliers?.[0]).toBe(960)

    // wynndata damage averages (non-crit / crit) — exact at this roll.
    const ophTotal = ophanim!.parts.find(p => p.name === 'Total Orbit DPS')
    const ophAvg = partAvg(ophTotal as Parameters<typeof partAvg>[0])
    expect(ophAvg.nc).toBeCloseTo(57703.27, 1)
    expect(ophAvg.cr).toBeCloseTo(115406.55, 1)

    const lwTotal = lightweaver!.parts.find(p => p.name === 'Total Orb DPS')
    const lwAvg = partAvg(lwTotal as Parameters<typeof partAvg>[0])
    expect(lwAvg.nc).toBeCloseTo(20779.49, 1)
    expect(lwAvg.cr).toBeCloseTo(41558.97, 1)

    // Bug 2 regression: replaced spells keep their base cost (Ophanim Meteor 50 + 30).
    expect(ophanim!.cost).toBeCloseTo(49.09, 1)
  })
})
