import { describe, expect, it } from 'vitest'
import {
  computeBuild,
  createCdnClient,
  decodeRawBuild,
  loadBuildContext,
  peekVersionId,
} from '../src/build-core'

// Real builder share hash (oracle build from app/stores/build.test.ts).
const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

// Network-dependent (hits cdn.wynn.tools); gated like the frontend oracle tests.
describe.skipIf(!process.env.LIVE_CDN)('build-core reuse (live CDN)', () => {
  it('decodes and computes a real build hash', async () => {
    const client = createCdnClient('https://cdn.wynn.tools/')
    const versionId = peekVersionId(ORACLE_HASH)
    const loaded = await loadBuildContext(client, versionId)

    const raw = decodeRawBuild(ORACLE_HASH, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
      recipeIsWeapon: () => false,
    }))

    const result = computeBuild(raw, loaded.ctx)
    expect(result).toBeTruthy()
    expect(result.stats).toBeTypeOf('object')
  }, 30_000)
})
