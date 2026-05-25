import type { CdnClient } from './cdn-client'
import { describe, expect, it, vi } from 'vitest'
import fixture from '../atree/__fixtures__/atree.sample.json'
import { loadAtreeData } from './atree-loader'

function fakeClient(payload: unknown, capture?: (p: string) => void): CdnClient {
  return {
    fetchJson: vi.fn(async (path: string) => {
      capture?.(path)
      return payload as never
    }),
  }
}

describe('loadAtreeData', () => {
  it('loads atree data from the default path', async () => {
    let used = ''
    const data = await loadAtreeData(fakeClient(fixture, p => (used = p)))
    expect(used).toBe('atree.json')
    expect(data.Archer).toHaveLength(4)
  })

  it('uses a custom path when provided', async () => {
    let used = ''
    await loadAtreeData(fakeClient(fixture, p => (used = p)), 'v2/atree.json')
    expect(used).toBe('v2/atree.json')
  })

  it('the Archer tree has exactly one head', async () => {
    const data = await loadAtreeData(fakeClient(fixture))
    const heads = data.Archer.filter(n => n.parents.length === 0)
    expect(heads).toHaveLength(1)
    expect(heads[0]!.id).toBe(100)
  })
})
