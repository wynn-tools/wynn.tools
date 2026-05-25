import type { StatMap, StatValue } from './merge-stat'
import { ATTACK_SPEEDS, BASE_DAMAGE_MULTIPLIER, SKP_ELEMENTS, SKP_ORDER } from './constants'
import { SKILLPOINT_DAMAGE_MULT, skillPointsToPercentage } from './skillpoints'
import { DAMAGE_KEYS } from './weapon-damage'

const DAMAGE_PRESENT_KEY = 'damagePresent'

export interface SpellDamageOptions {
  ignoreSpeed?: boolean
  partFilter?: string
  ignoreStr?: boolean
  ignoredMults?: string[]
}

export interface SpellDamageResult {
  normalTotal: [number, number]
  critTotal: [number, number]
  /** 6 rows (n,e,t,w,f,a), each [normMin, normMax, critMin, critMax]. */
  perElement: number[][]
  multipliedConversions: number[]
}

function num(stats: StatMap, key: string): number {
  const v = stats.get(key)
  return typeof v === 'number' ? v : 0
}

/**
 * Core damage calculation. Port of damage_calc.js calculateSpellDamage (normal weapons).
 * `conversions` is a length-6 array (n,e,t,w,f,a) of percentages.
 */
export function calculateSpellDamage(
  stats: StatMap,
  weapon: Map<string, unknown>,
  conversionsIn: number[],
  useSpellDamage: boolean,
  options: SpellDamageOptions = {},
): SpellDamageResult {
  const { ignoreSpeed = false, partFilter, ignoreStr = false, ignoredMults = [] } = options

  const weaponDamages = DAMAGE_KEYS.map(k => (weapon.get(k) as [number, number]).slice() as [number, number])
  let present = structuredClone(weapon.get(DAMAGE_PRESENT_KEY) as boolean[])

  const damageElements = ['n', ...SKP_ELEMENTS]

  const conversions = structuredClone(conversionsIn)
  if (partFilter !== undefined) {
    for (let i = 0; i < damageElements.length; ++i) {
      const name = `${damageElements[i]}ConvBase:${partFilter}`
      if (stats.has(name))
        conversions[i]! += num(stats, name)
    }
  }
  for (let i = 0; i < damageElements.length; ++i) {
    const name = `${damageElements[i]}ConvBase`
    if (stats.has(name))
      conversions[i]! += num(stats, name)
  }

  const damages: Array<[number, number]> = []
  const neutralConvert = conversions[0]! / 100
  if (neutralConvert === 0)
    present = [false, false, false, false, false, false]
  let weaponMin = 0
  let weaponMax = 0
  for (const dmg of weaponDamages) {
    damages.push([dmg[0] * neutralConvert, dmg[1] * neutralConvert])
    weaponMin += dmg[0]
    weaponMax += dmg[1]
  }

  let totalConvert = 0
  for (let i = 1; i <= 5; ++i) {
    if (conversions[i]! > 0) {
      const frac = conversions[i]! / 100
      damages[i]![0] += frac * weaponMin
      damages[i]![1] += frac * weaponMax
      present[i] = true
      totalConvert += frac
    }
  }
  totalConvert += conversions[0]! / 100

  if (!ignoreSpeed) {
    const mult = BASE_DAMAGE_MULTIPLIER[ATTACK_SPEEDS.indexOf(weapon.get('atkSpd') as string)]!
    for (let i = 0; i < 6; ++i) {
      damages[i]![0] *= mult
      damages[i]![1] *= mult
    }
  }

  for (let i = 0; i < damageElements.length; ++i) {
    if (present[i]) {
      damages[i]![0] += num(stats, `${damageElements[i]}DamAddMin`)
      damages[i]![1] += num(stats, `${damageElements[i]}DamAddMax`)
    }
  }

  const specific = useSpellDamage ? 'Sd' : 'Md'
  const skillBoost = [0]
  for (let i = 0; i < SKP_ORDER.length; ++i)
    skillBoost.push(skillPointsToPercentage(num(stats, SKP_ORDER[i]!)) * SKILLPOINT_DAMAGE_MULT[i]!)
  const staticBoost = (num(stats, `${specific.toLowerCase()}Pct`) + num(stats, 'damPct')) / 100

  let totalMin = 0
  let totalMax = 0
  const saveProp: Array<[number, number]> = []
  for (let i = 0; i < damageElements.length; ++i) {
    saveProp.push([damages[i]![0], damages[i]![1]])
    totalMin += damages[i]![0]
    totalMax += damages[i]![1]

    const damageSpecific = `${damageElements[i]}${specific}Pct`
    let damageBoost = 1 + skillBoost[i]! + staticBoost
      + (num(stats, damageSpecific) + num(stats, `${damageElements[i]}DamPct`)) / 100
    if (i > 0)
      damageBoost += (num(stats, `r${specific}Pct`) + num(stats, 'rDamPct')) / 100
    damages[i]![0] *= damageBoost
    damages[i]![1] *= damageBoost
  }

  const totalElemMin = totalMin - saveProp[0]![0]
  const totalElemMax = totalMax - saveProp[0]![1]

  const propRaw = num(stats, `${specific.toLowerCase()}Raw`) + num(stats, 'damRaw')
  const rainbowRaw = num(stats, `r${specific}Raw`) + num(stats, 'rDamRaw')
  for (let i = 0; i < damages.length; ++i) {
    const save = saveProp[i]!
    const dmg = damages[i]!
    let rawBoost = 0
    if (present[i])
      rawBoost += num(stats, `${damageElements[i]}${specific}Raw`) + num(stats, `${damageElements[i]}DamRaw`)
    let minBoost = rawBoost
    let maxBoost = rawBoost
    if (totalMax > 0) {
      minBoost += (totalMin === 0 ? save[1] / totalMax : save[0] / totalMin) * propRaw
      maxBoost += (save[1] / totalMax) * propRaw
    }
    if (i !== 0 && totalElemMax > 0) {
      minBoost += (totalElemMin === 0 ? save[1] / totalElemMax : save[0] / totalElemMin) * rainbowRaw
      maxBoost += (save[1] / totalElemMax) * rainbowRaw
    }
    dmg[0] += minBoost * totalConvert
    dmg[1] += maxBoost * totalConvert
  }

  const strBoost = ignoreStr ? 1 : 1 + skillBoost[1]!
  const multMap = (stats.get('damMult') instanceof Map ? stats.get('damMult') : new Map()) as Map<string, StatValue>
  let damageMult = 1
  const eleDamageMult = [1, 1, 1, 1, 1, 1]
  const multipliedConversions = [...conversions]

  for (const [k, v] of multMap.entries()) {
    if (typeof v !== 'number')
      continue
    if (k.includes(':')) {
      if (k.split(':')[1] !== partFilter)
        continue
    }
    if (ignoredMults.includes(k))
      continue
    if (k.includes(';')) {
      const eleBonus = k.split(';')[1]!
      const eleMatch = damageElements.indexOf(eleBonus)
      if (eleBonus === 'm' && !useSpellDamage)
        damageMult *= 1 + v / 100
      else if (eleMatch !== -1)
        eleDamageMult[eleMatch]! *= 1 + v / 100
    }
    else {
      damageMult *= 1 + v / 100
    }
  }
  const critMult = ignoreStr ? 0 : 1 + num(stats, 'critDamPct') / 100

  for (let i = 0; i < damageElements.length; ++i) {
    damages[i]![0] *= eleDamageMult[i]!
    damages[i]![1] *= eleDamageMult[i]!
    multipliedConversions[i]! *= eleDamageMult[i]! * damageMult
  }

  const normalTotal: [number, number] = [0, 0]
  const critTotal: [number, number] = [0, 0]
  const perElement: number[][] = []
  for (const dmg of damages) {
    if (dmg[0] < 0)
      dmg[0] = 0
    if (dmg[1] < 0)
      dmg[1] = 0
    const res = [
      dmg[0] * strBoost * damageMult,
      dmg[1] * strBoost * damageMult,
      dmg[0] * (strBoost + critMult) * damageMult,
      dmg[1] * (strBoost + critMult) * damageMult,
    ]
    perElement.push(res)
    normalTotal[0] += res[0]!
    normalTotal[1] += res[1]!
    critTotal[0] += res[2]!
    critTotal[1] += res[3]!
  }

  return { normalTotal, critTotal, perElement, multipliedConversions }
}
