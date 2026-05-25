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
// Always-on tests for new store features (no network)
// ---------------------------------------------------------------------------

describe('useBuildStore — currentHash and itemsForSlot (no network)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('currentHash is null with no build loaded', () => {
    const store = useBuildStore()
    expect(store.currentHash).toBeNull()
  })

  it('itemsForSlot returns [] when ctx is null', () => {
    const store = useBuildStore()
    expect(store.itemsForSlot(0)).toEqual([])
    expect(store.itemsForSlot(8)).toEqual([])
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

describe.skipIf(!process.env.LIVE_CDN)('useBuildStore — currentHash round-trip + setItem (live CDN)', () => {
  const oracleHash = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('currentHash equals oracleHash after loading (byte-exact round-trip)', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    expect(store.currentHash).toBe(oracleHash)
  }, 30_000)

  it('setItem changes currentHash and re-encoded build has correct equipmentId', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const { decodeRawBuild } = await import('~/lib/codec/build-codec')
    const { loadBuildContext, peekVersionId } = await import('~/composables/useBuildData')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    expect(store.result).not.toBeNull()
    const originalHp = store.result!.defense.totalHp
    expect(originalHp).toBe(11710)

    // Pick a helmet that differs from the current one
    const helmets = store.itemsForSlot(0)
    expect(helmets.length).toBeGreaterThan(0)
    const currentHelmetId = store.rawBuild!.equipmentIds[0]
    const altHelmet = helmets.find(h => h.id !== currentHelmetId)
    expect(altHelmet).toBeDefined()

    // Swap the helmet
    store.setItem(0, altHelmet!.id as number)

    // Hash must have changed
    expect(store.currentHash).not.toBe(oracleHash)
    expect(store.currentHash).not.toBeNull()

    // Re-decode the new hash and verify equipmentIds[0] === altHelmet.id
    const newHash = store.currentHash!
    const versionId = peekVersionId(newHash)
    const loaded = await loadBuildContext(client, versionId)
    const reDecoded = decodeRawBuild(newHash, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
    }))
    expect(reDecoded.equipmentIds[0]).toBe(altHelmet!.id)

    // totalHp should differ from the original oracle HP (most helmet swaps change HP)
    expect(store.result!.defense.totalHp).not.toBe(originalHp)
  }, 30_000)
})
