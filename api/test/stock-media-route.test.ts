import { Buffer } from 'node:buffer'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { env, resetEnvCache } from '../src/env'
import { writeBlob } from '../src/services/blob-store'
import { testApp } from './helpers/app'
import { makeBearer, makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'

const TMP = mkdtempSync(join(tmpdir(), 'media-route-'))

beforeAll(() => {
  process.env.UPLOAD_DIR = TMP
  resetEnvCache()
})

async function makeImageBlob(byte: number): Promise<string> {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, byte, 0, 0, 0])
  const { sha256, byteSize } = await writeBlob(buf)
  await getDb().insert(schema.stockBlob).values({
    sha256,
    byteSize,
    mimeType: 'image/png',
    originalFilename: 'x.png',
    refCount: 0,
  }).onConflictDoNothing()
  return sha256
}

async function createDraft(call: ReturnType<typeof testApp>, cookie: string, body: Record<string, unknown> = {}) {
  const r = await call('/v1/stock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': cookie },
    body: JSON.stringify({ title: 'T', kind: 'infobox', category: 'qol', classes: [], ...body }),
  })
  return await r.json() as { slug: string }
}

describe('pUT /v1/stock/:slug/media', () => {
  beforeEach(resetDb)

  it('401 unauthenticated', async () => {
    const r = await testApp()('/v1/stock/x/media', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL },
      body: JSON.stringify({ media: [] }),
    })
    expect(r.status).toBe(401)
  })

  it('403 when not owner', async () => {
    const owner = await makeUserWithSession()
    const { slug } = await createDraft(testApp(), owner.cookie)
    const intruder = await makeUserWithSession()
    const a = await makeImageBlob(1)
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': intruder.cookie },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: null }] }),
    })
    expect(r.status).toBe(403)
  })

  it('403 when bearer lacks stock:write', async () => {
    const { header } = await makeBearer({ scopes: ['stock:read'] })
    const owner = await makeUserWithSession()
    const { slug } = await createDraft(testApp(), owner.cookie)
    const a = await makeImageBlob(1)
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Authorization': header },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: null }] }),
    })
    expect(r.status).toBe(403)
  })

  it('200 owner replaces media', async () => {
    const u = await makeUserWithSession()
    const { slug } = await createDraft(testApp(), u.cookie)
    const a = await makeImageBlob(1)
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': u.cookie },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: 'hi' }] }),
    })
    expect(r.status).toBe(200)
    const rows = await getDb().query.stockMedia.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].caption).toBe('hi')
  })

  it('400 bad_media for >8 items', async () => {
    const u = await makeUserWithSession()
    const { slug } = await createDraft(testApp(), u.cookie)
    const shas = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map(makeImageBlob))
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': u.cookie },
      body: JSON.stringify({ media: shas.map(s => ({ blobSha256: s, caption: null })) }),
    })
    expect(r.status).toBe(400)
  })

  it('404 unknown slug', async () => {
    const u = await makeUserWithSession()
    const r = await testApp()(`/v1/stock/nope/media`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': u.cookie },
      body: JSON.stringify({ media: [] }),
    })
    expect(r.status).toBe(404)
  })
})

describe('pOST /v1/stock with media', () => {
  beforeEach(resetDb)

  it('attaches media on create', async () => {
    const u = await makeUserWithSession()
    const a = await makeImageBlob(1)
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': u.cookie },
      body: JSON.stringify({
        title: 'with media',
        kind: 'infobox',
        category: 'qol',
        classes: [],
        media: [{ blobSha256: a, caption: 'hi' }],
      }),
    })
    expect(r.status).toBe(200)
    const { slug } = await r.json() as { slug: string }
    const c = await getDb().query.stockCreation.findFirst({ where: (cc, { eq }) => eq(cc.slug, slug) })
    expect(c).toBeTruthy()
    const rows = await getDb().query.stockMedia.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].caption).toBe('hi')
    const blob = await getDb().query.stockBlob.findFirst({ where: (b, { eq }) => eq(b.sha256, a) })
    expect(blob!.refCount).toBe(1)
  })

  it('create with empty media still works', async () => {
    const u = await makeUserWithSession()
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Origin': env().FRONTEND_URL, 'Cookie': u.cookie },
      body: JSON.stringify({ title: 'no media', kind: 'infobox', category: 'qol', classes: [] }),
    })
    expect(r.status).toBe(200)
    expect(await getDb().query.stockMedia.findMany()).toHaveLength(0)
  })
})
