import { Buffer } from 'node:buffer'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { hasScope, requireAuth } from '../middleware/auth'
import { writeBlob } from '../services/blob-store'
import { sniffImageMime } from '../services/stock-image-guard'
import { getCreationBySlug, getVersion, listCreations } from '../services/stock-read'
import { assertSafeZip } from '../services/stock-zip-guard'

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ZIP_LIMITS = {
  maxCompressed: MAX_UPLOAD_BYTES,
  maxUncompressed: 60 * 1024 * 1024,
}
const IMAGE_MAX = 2 * 1024 * 1024

export const stock = new Hono()

const listQuery = z.object({
  kind: z.enum(['infobox', 'custom-bar', 'bundle']).optional(),
  class: z.enum(['mage', 'archer', 'warrior', 'shaman', 'assassin']).optional(),
  category: z.enum(['combat', 'party-ui', 'raid', 'lootrun', 'dps-meter', 'cooldown-tracker', 'resource-tracker', 'qol']).optional(),
  q: z.string().max(100).optional(),
  creator: z.string().max(40).optional(),
  sort: z.enum(['latest-activity', 'most-installed', 'most-reacted', 'newest', 'recently-updated']).optional().default('latest-activity'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
})

stock.get('/', zValidator('query', listQuery), async (c) => {
  const q = c.req.valid('query')
  const { items, nextCursor } = await listCreations(
    { kind: q.kind, class: q.class, category: q.category, q: q.q, creator: q.creator },
    q.sort,
    q.limit,
    q.cursor ?? null,
  )
  return c.json({ items, nextCursor })
})

stock.get('/:slug', async (c) => {
  const creation = await getCreationBySlug(c.req.param('slug'))
  if (!creation)
    throw new AppError(404, 'not_found', 'creation not found')
  return c.json(creation)
})

stock.get('/:slug/versions/:n', async (c) => {
  const n = Number(c.req.param('n'))
  if (!Number.isInteger(n) || n < 1)
    throw new AppError(400, 'bad_request', 'version must be a positive integer')
  const version = await getVersion(c.req.param('slug'), n)
  if (!version)
    throw new AppError(404, 'not_found', 'version not found')
  return c.json(version)
})

stock.post('/uploads', requireAuth, async (c) => {
  const auth = c.get('auth')
  const usedBearer = /^Bearer /i.test(c.req.header('authorization') ?? '')
  if (usedBearer && !hasScope(auth, 'stock:write'))
    throw new AppError(403, 'forbidden', 'stock:write scope required')

  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File))
    throw new AppError(400, 'bad_request', 'file field required')

  if (file.size > MAX_UPLOAD_BYTES)
    throw new AppError(413, 'too_large', `max upload is ${MAX_UPLOAD_BYTES} bytes`)

  const buf = Buffer.from(await file.arrayBuffer())
  let mimeType: string

  const image = sniffImageMime(buf)
  if (image) {
    if (buf.length > IMAGE_MAX)
      throw new AppError(413, 'too_large', `image max is ${IMAGE_MAX} bytes`)
    mimeType = image
  }
  else {
    try {
      assertSafeZip(buf, ZIP_LIMITS)
      mimeType = 'application/zip'
    }
    catch (err) {
      throw new AppError(415, 'unsupported_media', (err as Error).message)
    }
  }

  const { sha256, byteSize } = await writeBlob(buf)
  await getDb().insert(schema.stockBlob).values({
    sha256,
    byteSize,
    mimeType,
    originalFilename: file.name || 'upload',
    refCount: 0,
  }).onConflictDoNothing({ target: schema.stockBlob.sha256 })

  return c.json({ sha256, byteSize, mimeType })
})
