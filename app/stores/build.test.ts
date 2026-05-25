import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuildStore } from './build'

// ---------------------------------------------------------------------------
// Always-on tests (no network)
// ---------------------------------------------------------------------------

describe('useBuildStore — initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with rawBuild null, result null, loading false, error null', () => {
    const store = useBuildStore()
    expect(store.rawBuild).toBeNull()
    expect(store.result).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})

describe('useBuildStore — error handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets error and leaves result null when the client rejects', async () => {
    const store = useBuildStore()

    // Mock client that always rejects
    const badClient = {
      fetchJson: () => Promise.reject(new Error('network error')),
    }

    // Use the oracle hash so peekVersionId succeeds; loadBuildContext will fail on the client
    await store.loadFromHash('CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0', badClient as never)

    expect(store.error).toBeTruthy()
    expect(store.error).toContain('network error')
    expect(store.result).toBeNull()
    expect(store.loading).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Live CDN tests (skipped unless LIVE_CDN=1)
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.LIVE_CDN)('useBuildStore — live CDN oracle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads oracle hash and yields totalHp === 11710', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash('CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0', client)

    expect(store.error).toBeNull()
    expect(store.result).not.toBeNull()
    expect(store.result!.defense.totalHp).toBe(11710)
  }, 30_000)
})
