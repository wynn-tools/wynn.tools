import type { RawAspectData } from '../types/aspect'
import type { CdnClient } from './cdn-client'
import { describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/aspects.sample.json'
import { buildAspectDb, NONE_ASPECT } from './aspect-db'
import { loadAspectData } from './aspect-loader'

function fakeClient(payload: unknown, capture?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capture?.(path)
      return payload as never
    }),
  }
}

describe('aspect data', () => {
  it('defines the none-aspect', () => {
    expect(NONE_ASPECT).toEqual({ displayName: 'No Aspect', id: 256, tier: 'Normal', tiers: [], NONE: true })
  })

  it('loads from the default path', async () => {
    let used = ''
    await loadAspectData(fakeClient(fixture, p => (used = p)))
    expect(used).toBe('aspects.json')
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
