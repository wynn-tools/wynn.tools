import type { OgFetcher } from '../src/services/og-fetcher'
import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { getOgCache, setOgCache } from '../src/services/og-cache'
import { resetDb } from './helpers/db'

const FAKE_PNG = Buffer.from('PNG')
const FAKE_CONTENT_TYPE = 'image/png'

function makeFetcher(data = FAKE_PNG, contentType = FAKE_CONTENT_TYPE): OgFetcher & { fetchOgImage: ReturnType<typeof vi.fn> } {
  const fetchOgImage = vi.fn(async (_path: string) => ({ data, contentType }))
  return { fetchOgImage }
}

function app(fetcher?: OgFetcher) {
  const a = createApp(fetcher)
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}

async function insertBuild(visibility: 'public' | 'unlisted' | 'private' = 'public') {
  const [u] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: 'og', username: 'oguser' }).returning()
  const [b] = await getDb().insert(schema.builds).values({
    id: newResourceId(),
    userId: u.id,
    name: 'OG Build',
    buildString: 'fakehash',
    gameVersion: '2.2.0.31',
    visibility,
  }).returning()
  return b
}

describe('og build routes', () => {
  beforeEach(resetDb)

  it('returns 404 for unknown build', async () => {
    const res = await app()('/v1/og/build/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns 404 for private build', async () => {
    const build = await insertBuild('private')
    const res = await app(makeFetcher())(`/v1/og/build/${build.id}`)
    expect(res.status).toBe(404)
  })

  it('serves from cache without calling fetcher', async () => {
    const build = await insertBuild('public')
    await setOgCache(`build:${build.id}`, FAKE_PNG, 'image/png')
    const fetcher = makeFetcher()
    const res = await app(fetcher)(`/v1/og/build/${build.id}`)
    expect(res.status).toBe(200)
    expect(fetcher.fetchOgImage).not.toHaveBeenCalled()
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('calls fetcher on miss, stores result, returns 200', async () => {
    const build = await insertBuild('unlisted')
    const fetcher = makeFetcher()
    const res = await app(fetcher)(`/v1/og/build/${build.id}`)
    expect(res.status).toBe(200)
    expect(fetcher.fetchOgImage).toHaveBeenCalledWith(`/b/${build.id}`)
    const cached = await getOgCache(`build:${build.id}`)
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(FAKE_PNG)
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('returns 502 when fetcher throws', async () => {
    const build = await insertBuild('public')
    const fetchOgImage = vi.fn(async () => {
      throw new Error('nuxt down')
    })
    const fetcher: OgFetcher = { fetchOgImage }
    const res = await app(fetcher)(`/v1/og/build/${build.id}`)
    expect(res.status).toBe(502)
  })
})

describe('og item routes', () => {
  beforeEach(resetDb)

  it('serves from cache without calling fetcher', async () => {
    await setOgCache('item:divzer', FAKE_PNG, 'image/png')
    const fetcher = makeFetcher()
    const res = await app(fetcher)('/v1/og/item/divzer')
    expect(res.status).toBe(200)
    expect(fetcher.fetchOgImage).not.toHaveBeenCalled()
  })

  it('calls fetcher on miss and stores result', async () => {
    const fetcher = makeFetcher()
    const res = await app(fetcher)('/v1/og/item/divzer')
    expect(res.status).toBe(200)
    expect(fetcher.fetchOgImage).toHaveBeenCalledWith('/items/divzer')
    const cached = await getOgCache('item:divzer')
    expect(cached!.data).toEqual(FAKE_PNG)
  })

  it('returns 502 when fetcher throws', async () => {
    const fetcher: OgFetcher = {
      fetchOgImage: vi.fn(async () => {
        throw new Error('nuxt down')
      }),
    }
    const res = await app(fetcher)('/v1/og/item/unknown-item')
    expect(res.status).toBe(502)
  })
})
