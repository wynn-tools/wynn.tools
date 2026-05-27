import type { CdnClient } from './cdn-client'
import { describe, expect, it, vi } from 'vitest'
import itemsFile from './__fixtures__/cdn/items.json'
import setsFile from './__fixtures__/cdn/sets.json'
import versions from './__fixtures__/cdn/versions.json'
import { CdnError } from './cdn-client'
import { loadItemData } from './load-items'

// Newest version-tagged snapshot in the fixture versions.json (the trailing
// untagged entry is skipped, so the latest servable segment is 2.2.0.31).
const HASH = '2.2.0.31'

const files: Record<string, unknown> = {
  'versions.json': versions,
  [`data/${HASH}/items.json`]: itemsFile,
  [`data/${HASH}/sets.json`]: setsFile,
}

function fakeClient(byPath: Record<string, unknown> = files, capture?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capture?.(path)
      if (!(path in byPath))
        throw new Error(`unexpected fetch: ${path}`)
      return byPath[path] as never
    }),
  }
}

describe('loadItemData', () => {
  it('loads new-schema items from the latest snapshot via the adapters', async () => {
    const paths: string[] = []
    const db = await loadItemData(fakeClient(files, p => paths.push(p)))
    // Resolves the latest snapshot segment from versions.json.
    expect(paths).toContain('versions.json')
    expect(paths).toContain(`data/${HASH}/items.json`)
    expect(paths).toContain(`data/${HASH}/sets.json`)
    // Adapted item is indexed by display name + id.
    expect(db.byName.get('Dondasch')?.id).toBe(0)
    expect(db.byId.get(0)?.category).toBe('armor') // armour → armor
  })

  it('sources sets from the standalone sets.json', async () => {
    const db = await loadItemData(fakeClient())
    expect(db.sets.has('Adventurer')).toBe(true)
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
