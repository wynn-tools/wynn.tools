// app/lib/math/build-stats.ts
import type { ItemSet } from '../types/item'
import type { ExpandedItem } from './expand-item'
import type { StatMap } from './merge-stat'
import { SKP_ORDER } from './constants'
import { levelToHPBase } from './skillpoints'

/** Weapon-type → defensive multiplier. Port of build.js classDefenseMultipliers. */
export const CLASS_DEFENSE_MULTIPLIERS = new Map<string, number>([
  ['relik', 0.60],
  ['bow', 0.70],
  ['wand', 0.80],
  ['dagger', 1.0],
  ['spear', 1.0],
])

const STATIC_IDS = [
  'hp',
  'eDef',
  'tDef',
  'wDef',
  'fDef',
  'aDef',
  'str',
  'dex',
  'int',
  'def',
  'agi',
  'damMobs',
  'defMobs',
]

const MUST_IDS = [
  'eMdPct',
  'eMdRaw',
  'eSdPct',
  'eSdRaw',
  'eDamPct',
  'eDamRaw',
  'eDamAddMin',
  'eDamAddMax',
  'tMdPct',
  'tMdRaw',
  'tSdPct',
  'tSdRaw',
  'tDamPct',
  'tDamRaw',
  'tDamAddMin',
  'tDamAddMax',
  'wMdPct',
  'wMdRaw',
  'wSdPct',
  'wSdRaw',
  'wDamPct',
  'wDamRaw',
  'wDamAddMin',
  'wDamAddMax',
  'fMdPct',
  'fMdRaw',
  'fSdPct',
  'fSdRaw',
  'fDamPct',
  'fDamRaw',
  'fDamAddMin',
  'fDamAddMax',
  'aMdPct',
  'aMdRaw',
  'aSdPct',
  'aSdRaw',
  'aDamPct',
  'aDamRaw',
  'aDamAddMin',
  'aDamAddMax',
  'nMdPct',
  'nMdRaw',
  'nSdPct',
  'nSdRaw',
  'nDamPct',
  'nDamRaw',
  'nDamAddMin',
  'nDamAddMax',
  'mdPct',
  'mdRaw',
  'sdPct',
  'sdRaw',
  'damPct',
  'damRaw',
  'damAddMin',
  'damAddMax',
  'rMdPct',
  'rMdRaw',
  'rSdPct',
  'rSdRaw',
  'rDamPct',
  'rDamRaw',
  'rDamAddMin',
  'rDamAddMax',
  'healPct',
  'critDamPct',
]

function numOr0(v: unknown): number {
  return typeof v === 'number' ? v : 0
}

/**
 * Aggregate item stats into a build statMap.
 * Pure port of build.js Build.initBuildStats, plus classDef from weapon type.
 */
export function aggregateBuildStats(
  items: ExpandedItem[],
  weapon: ExpandedItem,
  level: number,
  activeSetCounts: Map<string, number>,
  sets: Map<string, ItemSet>,
): StatMap {
  const statMap: StatMap = new Map()

  for (const id of STATIC_IDS)
    statMap.set(id, 0)
  for (const id of MUST_IDS)
    statMap.set(id, 0)
  statMap.set('hp', levelToHPBase(level))
  statMap.set('agiDef', 90)

  const majorIds = new Set<string>()
  for (const item of items) {
    const appliedRolls = item.get('appliedRolls') as Map<string, number> | undefined
    if (appliedRolls) {
      for (const [id, value] of appliedRolls) {
        if (STATIC_IDS.includes(id))
          continue
        statMap.set(id, (numOr0(statMap.get(id))) + value)
      }
    }
    for (const id of STATIC_IDS) {
      const v = item.get(id)
      if (typeof v === 'number' && v)
        statMap.set(id, numOr0(statMap.get(id)) + v)
    }
    const itemMajor = item.get('majorIds') as string[] | undefined
    if (itemMajor) {
      for (const m of itemMajor)
        majorIds.add(m)
    }
  }

  const damMult = new Map<string, number>()
  const defMult = new Map<string, number>()
  statMap.set('damMult', damMult)
  statMap.set('defMult', defMult)
  damMult.set('tome', numOr0(statMap.get('damMobs')))
  defMult.set('tome', numOr0(statMap.get('defMobs')))
  statMap.set('activeMajorIDs', majorIds)

  for (const [setName, count] of activeSetCounts) {
    const bonus = sets.get(setName)!.bonuses[count - 1]!
    for (const id in bonus) {
      if ((SKP_ORDER as readonly string[]).includes(id))
        continue
      statMap.set(id, numOr0(statMap.get(id)) + bonus[id]!)
    }
  }

  statMap.set('poisonPct', 0)
  const healMult = new Map<string, number>()
  statMap.set('healMult', healMult)
  healMult.set('item', numOr0(statMap.get('healPct')))

  statMap.set('atkSpd', weapon.get('atkSpd'))
  statMap.set('classDef', CLASS_DEFENSE_MULTIPLIERS.get(weapon.get('type') as string) ?? 1.0)

  return statMap
}
