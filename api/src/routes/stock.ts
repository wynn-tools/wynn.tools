import type { Context } from 'hono'
import type { Auth } from '../middleware/auth'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { zValidator } from '@hono/zod-validator'
import { sql as drizzleSql, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { hasScope, requireAdmin, requireAuth } from '../middleware/auth'
import { readBlobStream, writeBlob } from '../services/blob-store'
import {
  adminBanUser,
  adminRebridge,
  adminRestoreBySlug,
  adminSoftDeleteBySlug,
} from '../services/stock-admin'
import { sniffImageMime } from '../services/stock-image-guard'
import { postModReport } from '../services/stock-mod-webhook'
import { isStockEmoji, toggleReaction } from '../services/stock-reactions'
import { getCreationBySlug, getDraftVersion, getRawPart, getVersion, listCreations } from '../services/stock-read'

import {
  createDraftCreation,
  createDraftVersion,
  patchCreationMeta,
  publishVersion,
  replaceDraftParts,
  softDeleteCreation,
} from '../services/stock-write'
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

stock.get('/blobs/:sha', async (c) => {
  const sha = c.req.param('sha')
  if (!/^[0-9a-f]{64}$/.test(sha))
    throw new AppError(400, 'bad_sha', 'invalid sha256')
  const blob = await getDb().query.stockBlob.findFirst({
    where: (b, { eq }) => eq(b.sha256, sha),
  })
  if (!blob)
    throw new AppError(404, 'not_found', 'blob not found')
  c.header('Cache-Control', 'public, max-age=31536000, immutable')
  c.header('Content-Type', blob.mimeType)
  return c.body(Readable.toWeb(readBlobStream(sha)) as ReadableStream)
})

stock.get('/:slug/versions/:n/parts/:partId/raw', async (c) => {
  const n = Number(c.req.param('n'))
  if (!Number.isInteger(n) || n < 1)
    throw new AppError(400, 'bad_request', 'version must be a positive integer')

  const part = await getRawPart(c.req.param('slug'), n, c.req.param('partId'))
  if (!part)
    throw new AppError(404, 'not_found', 'part not found')

  await getDb()
    .update(schema.stockCreation)
    .set({ installCount: drizzleSql`${schema.stockCreation.installCount} + 1` })
    .where(eq(schema.stockCreation.id, part.creationId))

  c.header('Cache-Control', 'public, max-age=31536000, immutable')

  if (part.role === 'resourcepack' && part.blobSha256) {
    c.header('Content-Type', 'application/zip')
    c.header('Content-Disposition', `attachment; filename="${(part.blobFilename ?? 'pack.zip').replace(/"/g, '')}"`)
    const node = readBlobStream(part.blobSha256)
    return c.body(Readable.toWeb(node) as ReadableStream)
  }

  c.header('Content-Type', 'text/plain; charset=utf-8')
  return c.body(part.textContent ?? '')
})

function assertWriteScope(c: Context) {
  const auth = c.get('auth') as Auth
  const usedBearer = /^Bearer /i.test(c.req.header('authorization') ?? '')
  if (usedBearer && !hasScope(auth, 'stock:write'))
    throw new AppError(403, 'forbidden', 'stock:write scope required')
}

async function requireAuthorBySlug(c: Context, slug: string): Promise<{ id: string, authorUserId: string }> {
  const auth = c.get('auth') as Auth
  const row = await getDb().query.stockCreation.findFirst({
    where: (cc, { and, eq, isNull }) => and(eq(cc.slug, slug), isNull(cc.deletedAt)),
    columns: { id: true, authorUserId: true },
  })
  if (!row)
    throw new AppError(404, 'not_found', 'creation not found')
  if (row.authorUserId !== auth.user.id)
    throw new AppError(403, 'forbidden', 'only the author may modify this creation')
  return row
}

const createBody = z.object({
  title: z.string().min(1).max(120),
  kind: z.enum(['infobox', 'custom-bar', 'bundle']),
  category: z.enum(['combat', 'party-ui', 'raid', 'lootrun', 'dps-meter', 'cooldown-tracker', 'resource-tracker', 'qol']),
  classes: z.array(z.enum(['mage', 'archer', 'warrior', 'shaman', 'assassin'])).max(5).optional().default([]),
  description: z.string().max(8000).optional(),
})

stock.post('/', requireAuth, zValidator('json', createBody), async (c) => {
  assertWriteScope(c)
  const auth = c.get('auth')
  const body = c.req.valid('json')
  const { id, slug } = await createDraftCreation({
    userId: auth.user.id,
    title: body.title,
    kind: body.kind,
    category: body.category,
    classes: body.classes,
    description: body.description,
  })
  return c.json({ id, slug })
})

const patchCreationBody = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  kind: z.enum(['infobox', 'custom-bar', 'bundle']).optional(),
  category: z.enum(['combat', 'party-ui', 'raid', 'lootrun', 'dps-meter', 'cooldown-tracker', 'resource-tracker', 'qol']).optional(),
  classes: z.array(z.enum(['mage', 'archer', 'warrior', 'shaman', 'assassin'])).max(5).optional(),
  creditsNote: z.string().max(8000).optional(),
})

stock.patch('/:slug', requireAuth, zValidator('json', patchCreationBody), async (c) => {
  assertWriteScope(c)
  const { id } = await requireAuthorBySlug(c, c.req.param('slug'))
  await patchCreationMeta(id, c.req.valid('json'))
  return c.json({ ok: true })
})

stock.get('/:slug/draft', requireAuth, async (c) => {
  assertWriteScope(c)
  const { id } = await requireAuthorBySlug(c, c.req.param('slug'))
  const draft = await getDraftVersion(id)
  if (!draft)
    throw new AppError(404, 'not_found', 'no draft version')
  return c.json(draft)
})

const createVersionBody = z.object({ label: z.string().min(1).max(40) })

stock.post('/:slug/versions', requireAuth, zValidator('json', createVersionBody), async (c) => {
  assertWriteScope(c)
  const { id } = await requireAuthorBySlug(c, c.req.param('slug'))
  const v = await createDraftVersion(id, c.get('auth').user.id, c.req.valid('json').label)
  return c.json(v)
})

const partBody = z.object({
  role: z.enum(['function', 'infobox', 'resourcepack']),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullable().optional(),
  group: z.string().min(1).max(40).nullable().optional(),
  textContent: z.string().max(64 * 1024).nullable().optional(),
  blobSha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().optional(),
  blobFilename: z.string().max(200).nullable().optional(),
})
const patchVersionBody = z.object({
  label: z.string().min(1).max(40).optional(),
  changelog: z.string().max(8000).optional(),
  parts: z.array(partBody).max(20).optional(),
})

stock.patch('/:slug/versions/:n', requireAuth, zValidator('json', patchVersionBody), async (c) => {
  assertWriteScope(c)
  const { id } = await requireAuthorBySlug(c, c.req.param('slug'))
  const n = Number(c.req.param('n'))
  const v = await getDb().query.stockVersion.findFirst({
    where: (vv, { and, eq }) => and(eq(vv.creationId, id), eq(vv.number, n)),
  })
  if (!v)
    throw new AppError(404, 'not_found', 'version not found')
  if (v.status !== 'draft')
    throw new AppError(409, 'not_draft', 'cannot edit published version')
  const body = c.req.valid('json')
  if (body.label !== undefined || body.changelog !== undefined) {
    await getDb().update(schema.stockVersion).set({
      ...(body.label ? { label: body.label } : {}),
      ...(body.changelog !== undefined ? { changelog: body.changelog } : {}),
    }).where(eq(schema.stockVersion.id, v.id))
  }
  if (body.parts)
    await replaceDraftParts(v.id, body.parts)
  return c.json({ ok: true })
})

stock.post('/:slug/versions/:n/publish', requireAuth, async (c) => {
  assertWriteScope(c)
  const { id } = await requireAuthorBySlug(c, c.req.param('slug'))
  const n = Number(c.req.param('n'))
  const v = await getDb().query.stockVersion.findFirst({
    where: (vv, { and, eq }) => and(eq(vv.creationId, id), eq(vv.number, n)),
  })
  if (!v)
    throw new AppError(404, 'not_found', 'version not found')
  await publishVersion(v.id)
  return c.json({ ok: true })
})

stock.delete('/:slug', requireAuth, async (c) => {
  assertWriteScope(c)
  const auth = c.get('auth')
  const row = await getDb().query.stockCreation.findFirst({
    where: (cc, { eq, and, isNull }) => and(eq(cc.slug, c.req.param('slug')), isNull(cc.deletedAt)),
    columns: { id: true },
  })
  if (!row)
    throw new AppError(404, 'not_found', 'creation not found')
  await softDeleteCreation(row.id, auth.user.id)
  return c.body(null, 204)
})

const reactionBody = z.object({
  emoji: z.string().refine(isStockEmoji, { message: 'unknown emoji' }),
})

stock.post('/:slug/reactions', requireAuth, zValidator('json', reactionBody), async (c) => {
  const auth = c.get('auth')
  const creation = await getDb().query.stockCreation.findFirst({
    where: (cc, { and, eq, isNull }) => and(eq(cc.slug, c.req.param('slug')), isNull(cc.deletedAt)),
    columns: { id: true },
  })
  if (!creation)
    throw new AppError(404, 'not_found', 'creation not found')
  const counts = await toggleReaction(creation.id, auth.user.id, c.req.valid('json').emoji as never)
  return c.json(counts)
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

const reportBody = z.object({ reason: z.string().min(1).max(2000) })

stock.post('/:slug/report', requireAuth, zValidator('json', reportBody), async (c) => {
  const auth = c.get('auth')
  const creation = await getDb().query.stockCreation.findFirst({
    where: (cc, { and, eq, isNull }) => and(eq(cc.slug, c.req.param('slug')), isNull(cc.deletedAt)),
    columns: { id: true, slug: true, title: true },
  })
  if (!creation)
    throw new AppError(404, 'not_found', 'creation not found')
  const { reason } = c.req.valid('json')
  await getDb().insert(schema.stockReport).values({
    id: newResourceId(),
    creationId: creation.id,
    reporterUserId: auth.user.id,
    reason,
  })
  const url = `${env().FRONTEND_URL}/stock/${creation.slug}`
  void postModReport(`**Report** on **${creation.title}** (${url})\nby <@${auth.user.id}>\nReason: ${reason}`)
  return c.json({ ok: true })
})

stock.post('/admin/:slug/soft-delete', requireAdmin, async (c) => {
  await adminSoftDeleteBySlug(c.get('auth').user.id, c.req.param('slug'))
  return c.json({ ok: true })
})

stock.post('/admin/:slug/restore', requireAdmin, async (c) => {
  await adminRestoreBySlug(c.get('auth').user.id, c.req.param('slug'))
  return c.json({ ok: true })
})

stock.post('/admin/:slug/rebridge', requireAdmin, async (c) => {
  await adminRebridge(c.get('auth').user.id, c.req.param('slug'))
  return c.json({ ok: true })
})

stock.post('/admin/users/:id/ban', requireAdmin, async (c) => {
  await adminBanUser(c.get('auth').user.id, c.req.param('id'))
  return c.json({ ok: true })
})
