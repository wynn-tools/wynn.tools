// app/lib/wynntils/id-keys.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { _resetIdKeysCacheForTests, getIdKeys } from './id-keys'

afterEach(() => _resetIdKeysCacheForTests())

function stubFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  })) as unknown as typeof fetch
}

describe('getIdKeys', () => {
  it('returns a byte→name map from the fetched JSON', async () => {
    const f = stubFetch({ rawStrength: 12, mainAttackDamage: 34 })
    const map = await getIdKeys(f)
    expect(map.get(12)).toBe('rawStrength')
    expect(map.get(34)).toBe('mainAttackDamage')
  })

  it('caches the result across calls', async () => {
    const f = stubFetch({ rawStrength: 12 })
    await getIdKeys(f)
    await getIdKeys(f)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('does not cache on failure — next call retries', async () => {
    const bad = stubFetch({}, false)
    await expect(getIdKeys(bad)).rejects.toThrow()
    const good = stubFetch({ rawStrength: 12 })
    const map = await getIdKeys(good)
    expect(map.get(12)).toBe('rawStrength')
  })
})
