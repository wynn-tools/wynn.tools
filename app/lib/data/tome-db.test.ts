import type { RawTomeData } from '../types/tome'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/tomes.sample.json'
import { buildTomeDb, NONE_TOMES } from './tome-db'

describe('tome data', () => {
  it('defines 7 none-tomes with the canonical ids', () => {
    expect(NONE_TOMES.map(t => t.id)).toEqual([61, 62, 63, 93, 162, 163, 164])
    expect(NONE_TOMES[0]!.name).toBe('No Weapon Tome')
  })

  it('builds the db: indexes by id/name and injects none-tomes', () => {
    const db = buildTomeDb(fixture as RawTomeData)
    expect(db.byId.get(1)?.name).toBe('Tome of Strength I')
    expect(db.byName.get('Tome of Defence I')?.id).toBe(2)
    expect(db.byId.get(61)?.name).toBe('No Weapon Tome')
  })

  it('resolves redirects and unknown ids', () => {
    const db = buildTomeDb(fixture as RawTomeData)
    expect(db.resolveId(3)?.name).toBe('Tome of Strength I')
    expect(db.resolveId(99999)).toBeUndefined()
  })
})
