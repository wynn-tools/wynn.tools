import type { RawAspectData } from '../types/aspect'
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/aspects.sample.json'
import { buildAspectDb, NONE_ASPECT } from './aspect-db'

describe('aspect data', () => {
  it('defines the none-aspect', () => {
    expect(NONE_ASPECT).toEqual({ displayName: 'No Aspect', id: 256, tier: 'Normal', tiers: [], NONE: true })
  })

  it('builds per-class id maps with none-aspect injected', () => {
    const db = buildAspectDb(fixture as RawAspectData)
    const archer = db.byClass.get('Archer')!
    expect(archer.get(256)?.displayName).toBe('No Aspect')
    expect(archer.get(1)?.displayName).toBe('Aspect of Focus')
    expect(archer.get(1)?.NONE).toBe(false)
    expect(db.byClass.get('Mage')!.get(1)?.displayName).toBe('Aspect of Flow')
  })
})
