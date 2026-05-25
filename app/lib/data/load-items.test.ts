import type { CdnClient } from './cdn-client'
import { describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/items.sample.json'
import { CdnError } from './cdn-client'
import { loadItemData } from './load-items'

function fakeClient(payload: unknown, capturePath?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capturePath?.(path)
      return payload as never
    }),
  }
}

describe('loadItemData', () => {
  it('loads and builds the item db from the default path', async () => {
    let used = ''
    const db = await loadItemData(fakeClient(fixture, p => (used = p)))
    expect(used).toBe('items.json')
    expect(db.byName.get('Adherence')?.id).toBe(4056)
  })

  it('uses a custom path when provided', async () => {
    let used = ''
    await loadItemData(fakeClient(fixture, p => (used = p)), 'v2/items.json')
    expect(used).toBe('v2/items.json')
  })

  it('propagates CdnError', async () => {
    const client: CdnClient = {
      fetchJson: vi.fn(async () => {
        throw new CdnError('boom')
      }),
    }
    await expect(loadItemData(client)).rejects.toBeInstanceOf(CdnError)
  })
})
