import { POWDER_TIERS } from '../data/powder-constants'
import { ATTACK_SPEEDS, BASE_DAMAGE_MULTIPLIER } from './constants'
import { POWDER_STATS } from './powder-stats'

/** Expanded damage keys, order n,e,t,w,f,a. */
export const DAMAGE_KEYS = ['nDam_', 'eDam_', 'tDam_', 'wDam_', 'fDam_', 'aDam_']
const BASE_DAMAGE_FIELDS = ['nDam', 'eDam', 'tDam', 'wDam', 'fDam', 'aDam']

type WeaponMap = Map<string, unknown>

function parsePair(s: unknown): [number, number] {
  const parts = String(s ?? '0-0').split('-').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0]
}

export interface WeaponPowderResult {
  damages: Array<[number, number]>
  present: boolean[]
}

/**
 * Compute weapon damage after powders (normal weapons only).
 * Port of powders.js calc_weapon_powder (active path).
 */
export function calcWeaponPowder(weapon: WeaponMap): WeaponPowderResult {
  const powders = (weapon.get('powders') as number[] | undefined)?.slice() ?? []
  const damages: Array<[number, number]> = BASE_DAMAGE_FIELDS.map(f => parsePair(weapon.get(f)))
  const neutralRemaining: [number, number] = [...damages[0]!] as [number, number]

  const order: number[] = []
  const map = new Map<number, { conv: number, min: number, max: number }>()
  for (const powderId of powders) {
    const powder = POWDER_STATS[powderId]!
    const element = Math.floor(powderId / POWDER_TIERS)
    const convRatio = powder.convert / 100
    const info = map.get(element)
    if (info) {
      info.conv += convRatio
      info.min += powder.min
      info.max += powder.max
    }
    else {
      order.push(element)
      map.set(element, { conv: convRatio, min: powder.min, max: powder.max })
    }
  }

  for (const element of order) {
    const info = map.get(element)!
    const minDiff = Math.min(neutralRemaining[0], info.conv * neutralRemaining[0])
    const maxDiff = Math.min(neutralRemaining[1], info.conv * neutralRemaining[1])
    neutralRemaining[0] -= minDiff
    neutralRemaining[1] -= maxDiff
    damages[element + 1]![0] += minDiff
    damages[element + 1]![1] += maxDiff
    damages[element + 1]![0] += info.min
    damages[element + 1]![1] += info.max
  }

  // Neutral damage is NOT reduced by powder conversion — port of WynnBuilder's
  // calc_weapon_powder which tracks neutralRemainingRaw but never writes it back
  // to damages[0]. The conversion adds to elemental without subtracting from neutral.
  const present = damages.map(d => d[1] > 0)
  return { damages, present }
}

/** Set nDam_..aDam_ + damagePresent on the weapon (normal weapons). Port of apply_weapon_powders. */
export function applyWeaponPowders(weapon: WeaponMap): void {
  const { damages, present } = calcWeaponPowder(weapon)
  for (let i = 0; i < DAMAGE_KEYS.length; ++i)
    weapon.set(DAMAGE_KEYS[i]!, damages[i])
  weapon.set('damagePresent', present)
}

/** Base weapon DPS (normal weapons). Port of damage_calc.js get_base_dps. */
export function getBaseDps(weapon: WeaponMap): number {
  const attackSpeedMult = BASE_DAMAGE_MULTIPLIER[ATTACK_SPEEDS.indexOf(weapon.get('atkSpd') as string)]!
  let total = 0
  for (const key of DAMAGE_KEYS) {
    const d = weapon.get(key) as [number, number]
    total += d[0] + d[1]
  }
  return (total * attackSpeedMult) / 2
}
