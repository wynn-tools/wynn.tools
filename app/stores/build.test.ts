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

describe('useBuildStore — atreeNodes (no network)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('atreeNodes is [] before a build loads', () => {
    const store = useBuildStore()
    expect(store.atreeNodes).toEqual([])
  })
})

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

describe('useBuildStore — skillpoints (no network)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('skillpoints is [0,0,0,0,0] before any build is loaded', () => {
    const store = useBuildStore()
    expect(store.skillpoints).toEqual([0, 0, 0, 0, 0])
  })
})

// ---------------------------------------------------------------------------
// Always-on tests for powder helpers (no network)
// ---------------------------------------------------------------------------

describe('useBuildStore — powder helpers (no network)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('maxPowderSlots(8) === 0 before a build loads', () => {
    const store = useBuildStore()
    expect(store.maxPowderSlots(8)).toBe(0)
  })

  it('powdersForEquipmentSlot(8) deep-equals [] before a build loads', () => {
    const store = useBuildStore()
    expect(store.powdersForEquipmentSlot(8)).toEqual([])
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

describe.skipIf(!process.env.LIVE_CDN)('useBuildStore — skillpoints + setSkillpoint (live CDN)', () => {
  const oracleHash = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('skillpoints reads effective totals from oracle build', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    expect(store.skillpoints[0]).toBe(55) // str
    expect(store.skillpoints[1]).toBe(80) // dex
    expect(store.skillpoints[4]).toBe(85) // agi
  }, 30_000)

  it('setSkillpoint(0, 100) updates result.stats and currentHash, and re-decoding yields sp[0]===100', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const { decodeRawBuild } = await import('~/lib/codec/build-codec')
    const { loadBuildContext, peekVersionId } = await import('~/composables/useBuildData')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()

    store.setSkillpoint(0, 100)

    // result.stats reflects the new value
    expect(store.result!.stats.get('str')).toBe(100)

    // currentHash must have changed
    expect(store.currentHash).not.toBe(oracleHash)
    expect(store.currentHash).not.toBeNull()

    // Re-decode the new hash and verify sp[0] === 100
    const newHash = store.currentHash!
    const versionId = peekVersionId(newHash)
    const loaded = await loadBuildContext(client, versionId)
    const reDecoded = decodeRawBuild(newHash, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
    }))
    expect(Array.isArray(reDecoded.sp)).toBe(true)
    expect(reDecoded.sp![0]).toBe(100)
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

describe.skipIf(!process.env.LIVE_CDN)('useBuildStore — powder editing (live CDN)', () => {
  const oracleHash = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('powdersForEquipmentSlot(8) deep-equals [34,34,13] and maxPowderSlots(8)===3 after loading oracle', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    expect(store.powdersForEquipmentSlot(8)).toEqual([34, 34, 13])
    expect(store.maxPowderSlots(8)).toBe(3)
  }, 30_000)

  it('setPowders(8, [0]) changes currentHash and averageDps; re-decoding yields weapon powders [0]', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const { decodeRawBuild } = await import('~/lib/codec/build-codec')
    const { loadBuildContext, peekVersionId } = await import('~/composables/useBuildData')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    const orig = store.currentHash!
    const origDps = store.result!.melee.averageDps

    store.setPowders(8, [0])

    expect(store.currentHash).not.toBe(orig)
    expect(store.result!.melee.averageDps).not.toBe(origDps)

    // Re-decode and confirm weapon powders (powders[4]) === [0]
    const newHash = store.currentHash!
    const versionId = peekVersionId(newHash)
    const loaded = await loadBuildContext(client, versionId)
    const reDecoded = decodeRawBuild(newHash, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
    }))
    expect(reDecoded.powders[4]).toEqual([0])
  }, 30_000)

  it('setPowders(8, [34,34,13]) after mutation restores the original hash (byte-exact)', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    const orig = store.currentHash!

    // Mutate
    store.setPowders(8, [0])
    expect(store.currentHash).not.toBe(orig)

    // Restore
    store.setPowders(8, [34, 34, 13])
    expect(store.currentHash).toBe(orig)
  }, 30_000)
})

describe.skipIf(!process.env.LIVE_CDN)('useBuildStore — atree selection/validation (live CDN)', () => {
  const oracleHash = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('atreeNodes.length === 93 for Shaman oracle and atreeValidation reflects decoded selection', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)

    expect(store.error).toBeNull()
    expect(store.atreeNodes.length).toBe(93)
    // Oracle has 35 active nodes at the AP cap (50); root (Totem) is always decoded as active
    expect(store.atreeValidation.apTotal).toBe(50)
    expect(store.atreeValidation.reachable.size).toBe(35)
  }, 30_000)

  it('toggleAtreeNode: toggling root off prunes all descendants; toggling an inactive reachable node on/off round-trips', async () => {
    const { createCdnClient } = await import('~/lib/data/cdn-client')
    const client = createCdnClient('https://wynnbuilder-beta.github.io/data')
    const store = useBuildStore()

    await store.loadFromHash(oracleHash, client)
    expect(store.error).toBeNull()

    const root = store.atreeNodes.find(n => n.parents.length === 0)
    expect(root).toBeDefined()

    // Root is already active in the oracle (root is always decoded as active)
    expect(store.isAtreeActive(root!.ability.id)).toBe(true)

    // Save orig hash
    const orig = store.currentHash

    // Toggle root OFF — this prunes all descendants since root is a parent of everything
    store.toggleAtreeNode(root!.ability.id)
    expect(store.rawBuild!.activeAtree.length).toBe(0)
    expect(store.atreeValidation.apTotal).toBe(0)
    expect(store.currentHash).not.toBe(orig)

    // Now toggle root ON — it's a root node (no parents) so always reachable
    store.toggleAtreeNode(root!.ability.id)
    expect(store.rawBuild!.activeAtree).toContain(root!.ability.id)
    expect(store.atreeValidation.apTotal).toBe(root!.ability.cost)
    expect(store.atreeValidation.reachable.has(root!.ability.id)).toBe(true)
  }, 30_000)
})
