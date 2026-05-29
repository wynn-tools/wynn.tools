import { describe, expect, it } from 'vitest'
import { decodeBuild } from '../src/services/build-decode'

const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

// Network-dependent; gated like the frontend oracle tests.
describe.skipIf(!process.env.LIVE_CDN)('decodeBuild (live CDN)', () => {
  it('returns gameVersion and decoded stats', async () => {
    const out = await decodeBuild(ORACLE_HASH)
    expect(out.gameVersion).toMatch(/^\d+\./)
    expect(out.decoded).toBeTruthy()
  }, 30_000)
})

// Network-independent: malformed input must fail before any CDN call.
// "CU" is a 2-char string (12 bits) — too short for the 16-bit build header
// (6-bit flag + 10-bit version). peekVersionId throws a RangeError immediately
// inside BitVectorCursor.advanceBy, before any network call is made.
describe('decodeBuild validation', () => {
  it('throws AppError invalid_build on garbage', async () => {
    await expect(decodeBuild('CU')).rejects.toMatchObject({ code: 'invalid_build' })
  })
})
