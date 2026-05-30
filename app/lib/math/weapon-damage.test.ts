import { describe, expect, it } from 'vitest'
import { applyWeaponPowders, calcWeaponPowder, getBaseDps } from './weapon-damage'

function weapon(fields: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>()
  const defaults = { nDam: '0-0', eDam: '0-0', tDam: '0-0', wDam: '0-0', fDam: '0-0', aDam: '0-0', atkSpd: 'NORMAL', tier: 'Legendary', powders: [] as number[] }
  for (const [k, v] of Object.entries({ ...defaults, ...fields }))
    m.set(k, v)
  return m
}

describe('weapon damage', () => {
  it('parses base damage with no powders', () => {
    const w = weapon({ nDam: '100-160', fDam: '50-70' })
    const { damages, present } = calcWeaponPowder(w)
    expect(damages[0]).toEqual([100, 160]) // neutral
    expect(damages[4]).toEqual([50, 70]) // fire (n,e,t,w,f,a -> index 4)
    expect(present[0]).toBe(true)
    expect(present[4]).toBe(true)
    expect(present[1]).toBe(false) // earth absent
  })

  it('applyWeaponPowders sets nDam_ and damagePresent', () => {
    const w = weapon({ nDam: '100-160' })
    applyWeaponPowders(w)
    expect(w.get('nDam_')).toEqual([100, 160])
    expect((w.get('damagePresent') as boolean[])[0]).toBe(true)
  })

  it('getBaseDps for a NORMAL-speed neutral weapon', () => {
    const w = weapon({ nDam: '100-160', atkSpd: 'NORMAL' })
    applyWeaponPowders(w)
    expect(getBaseDps(w)).toBeCloseTo(266.5, 6) // (100+160)*2.05/2
  })

  it('a fire powder converts neutral into fire (neutral reduced)', () => {
    // fire t1 id = element 3 * 7 = 21 -> POWDER_STATS[21] (convert 14%, flat +2..+5).
    // WynnBuilder converts: the converted portion is SUBTRACTED from neutral and
    // added to the element, plus a flat element bonus (powders.js:256
    // `damages[0] = neutralRemainingRaw`).
    const w = weapon({ nDam: '100-160', powders: [21] })
    const { damages, present } = calcWeaponPowder(w)
    expect(present[4]).toBe(true)
    // neutral reduced by 14%: 100->86, 160->137.6
    expect(damages[0][0]).toBeCloseTo(86, 6)
    expect(damages[0][1]).toBeCloseTo(137.6, 6)
    // fire = converted (14% of neutral) + flat bonus: [14+2, 22.4+5]
    expect(damages[4][0]).toBeCloseTo(16, 6)
    expect(damages[4][1]).toBeCloseTo(27.4, 6)
  })
})
