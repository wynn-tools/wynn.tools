import type { CdnClient } from '../data/cdn-client'
import { describe, expect, it, vi } from 'vitest'
import { loadEncodingConstants } from './encoding-constants'

function fakeClient(payload: unknown, capture?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capture?.(path)
      return payload as never
    }),
  }
}

describe('loadEncodingConstants', () => {
  it('fetches encoding_consts from the resolved snapshot segment', async () => {
    let used = ''
    const consts = { TOME_NUM: 7 }
    const out = await loadEncodingConstants(fakeClient(consts, p => (used = p)), 'a3f82c91')
    expect(used).toBe('a3f82c91/encoding_consts.json')
    expect(out.TOME_NUM).toBe(7)
  })
})
