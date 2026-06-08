import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { getCachedWeights } from '../src/services/weights-cache'

beforeEach(async () => {
  await getDb().delete(schema.weightCache).execute()
})

function nori(profiles: any[] = [{ name: 'A', scales: { x: 1 } }]) {
  return {
    fetchWeights: vi.fn(async () => profiles),
  }
}

function wynnpool(profiles: any[] = [{ name: 'B', scales: { y: 1 } }]) {
  return {
    fetchWeights: vi.fn(async () => profiles),
  }
}

describe('weights cache', () => {
  it('fans out + caches on miss', async () => {
    const n = nori()
    const w = wynnpool()
    const r = await getCachedWeights('Cibola', 'PUA', { nori: n, wynnpool: w })
    expect(r.nori?.profiles).toHaveLength(1)
    expect(r.wynnpool?.profiles).toHaveLength(1)
    expect(n.fetchWeights).toHaveBeenCalledOnce()
    expect(w.fetchWeights).toHaveBeenCalledOnce()
  })
  it('serves fresh cache without calling upstreams', async () => {
    const n1 = nori()
    const w1 = wynnpool()
    await getCachedWeights('Cibola', 'PUA', { nori: n1, wynnpool: w1 })
    const n2 = nori()
    const w2 = wynnpool()
    await getCachedWeights('Cibola', 'PUA', { nori: n2, wynnpool: w2 })
    expect(n2.fetchWeights).not.toHaveBeenCalled()
    expect(w2.fetchWeights).not.toHaveBeenCalled()
  })
  it('one upstream failure → that side is null, the other survives', async () => {
    const failing = {
      fetchWeights: vi.fn(async () => {
        throw new Error('boom')
      }),
    }
    const r = await getCachedWeights('Cibola', 'PUA', {
      nori: failing,
      wynnpool: wynnpool(),
    })
    expect(r.nori).toBeNull()
    expect(r.wynnpool?.profiles).toHaveLength(1)
  })
})
