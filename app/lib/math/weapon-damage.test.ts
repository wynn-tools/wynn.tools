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

  it('a fire powder adds fire damage without reducing neutral', () => {
    // fire t1 id = element 3 * 7 = 21 -> POWDER_STATS[21]
    // WynnBuilder does NOT subtract from neutral when converting — additive only.
    const w = weapon({ nDam: '100-160', powders: [21] })
    const { damages, present } = calcWeaponPowder(w)
    expect(present[4]).toBe(true)
    expect(damages[0][1]).toBe(160) // neutral unchanged
    expect(damages[4][1]).toBeGreaterThan(0) // fire added
  })
})
