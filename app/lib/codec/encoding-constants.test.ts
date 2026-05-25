import type { CdnClient } from '../data/cdn-client'
import { describe, expect, it, vi } from 'vitest'
import { loadEncodingConstants } from './encoding-constants'
import { WYNN_VERSION_LATEST, WYNN_VERSION_NAMES } from './version'

function fakeClient(payload: unknown, capture?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capture?.(path)
      return payload as never
    }),
  }
}

describe('version + encoding constants', () => {
  it('has the latest version as the last entry', () => {
    expect(WYNN_VERSION_NAMES[WYNN_VERSION_LATEST]).toBe('2.2.0.31')
    expect(WYNN_VERSION_NAMES.length).toBe(31)
  })

  it('fetches constants for the version-id path', async () => {
    let used = ''
    const consts = { TOME_NUM: 7 }
    const out = await loadEncodingConstants(fakeClient(consts, p => (used = p)), WYNN_VERSION_LATEST)
    expect(used).toBe('2.2.0.31/encoding_consts.json')
    expect(out.TOME_NUM).toBe(7)
  })

  it('throws on out-of-range version id', async () => {
    await expect(loadEncodingConstants(fakeClient({}), 999)).rejects.toThrow()
  })
})
