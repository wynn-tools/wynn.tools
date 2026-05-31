import type { Buffer } from 'node:buffer'
import type { OgFetcher } from '../services/og-fetcher'
import { Hono } from 'hono'
import { getDb } from '../db/client'
import { AppError } from '../lib/errors'
import { getOgCache, setOgCache } from '../services/og-cache'

const IMMUTABLE = 'public, max-age=31536000, immutable'

export function createOgRoute(fetcher: OgFetcher) {
  return new Hono()
    .get('/build/:id', async (c) => {
      const id = c.req.param('id')
      const build = await getDb().query.builds.findFirst({
        where: (b, { eq }) => eq(b.id, id),
        columns: { id: true, visibility: true },
      })
      if (!build || build.visibility === 'private')
        throw new AppError(404, 'not_found', 'Build not found')

      const cached = await getOgCache(`build:${id}`)
      if (cached) {
        return c.body(cached.data, 200, {
          'Content-Type': cached.contentType,
          'Cache-Control': IMMUTABLE,
        })
      }

      let result: { data: Buffer, contentType: string }
      try {
        result = await fetcher.fetchOgImage(`/b/${id}`)
      }
      catch (err) {
        throw new AppError(502, 'og_fetch_failed', (err as Error).message)
      }
      await setOgCache(`build:${id}`, result.data, result.contentType)
      return c.body(result.data, 200, {
        'Content-Type': result.contentType,
        'Cache-Control': IMMUTABLE,
      })
    })
    .get('/item/:slug', async (c) => {
      const slug = c.req.param('slug')

      const cached = await getOgCache(`item:${slug}`)
      if (cached) {
        return c.body(cached.data, 200, {
          'Content-Type': cached.contentType,
          'Cache-Control': IMMUTABLE,
        })
      }

      let result: { data: Buffer, contentType: string }
      try {
        result = await fetcher.fetchOgImage(`/items/${slug}`)
      }
      catch (err) {
        throw new AppError(502, 'og_fetch_failed', (err as Error).message)
      }
      await setOgCache(`item:${slug}`, result.data, result.contentType)
      return c.body(result.data, 200, {
        'Content-Type': result.contentType,
        'Cache-Control': IMMUTABLE,
      })
    })
}
