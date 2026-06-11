import { Buffer } from 'node:buffer'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import AdmZip from 'adm-zip'
import { sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { resetEnvCache } from '../src/env'
import { writeBlob } from '../src/services/blob-store'
import { testApp } from './helpers/app'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

const TMP = mkdtempSync(join(tmpdir(), 'raw-'))
beforeAll(() => {
  process.env.UPLOAD_DIR = TMP
  resetEnvCache()
})

describe('gET /v1/stock/:slug/versions/:n/parts/:partId/raw', () => {
  beforeEach(resetDb)

  it('returns text content for a function part', async () => {
    const fx = await insertCreation({
      slug: 'k',
      parts: [{ role: 'function', name: 'Frame', textContent: '{hello}' }],
    })
    const part = (await getDb().query.stockPart.findFirst({
      where: (p, { eq }) => eq(p.versionId, fx.versionId),
    }))!
    const r = await testApp()(`/v1/stock/k/versions/1/parts/${part.id}/raw`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/plain/)
    expect(await r.text()).toBe('{hello}')
    expect(r.headers.get('cache-control')).toContain('immutable')
  })

  it('streams a resourcepack blob', async () => {
    const z = new AdmZip()
    z.addFile('pack.mcmeta', Buffer.from('{}'))
    const bytes = z.toBuffer()
    const { sha256, byteSize } = await writeBlob(bytes)
    await getDb().insert(schema.stockBlob).values({
      sha256,
      byteSize,
      mimeType: 'application/zip',
      originalFilename: 'p.zip',
      refCount: 1,
    })
    const fx = await insertCreation({
      slug: 'k',
      parts: [{ role: 'resourcepack', name: 'Pack', blobSha256: sha256 }],
    })
    const part = (await getDb().query.stockPart.findFirst({
      where: (p, { eq }) => eq(p.versionId, fx.versionId),
    }))!
    const r = await testApp()(`/v1/stock/k/versions/1/parts/${part.id}/raw`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('application/zip')
    expect(r.headers.get('content-disposition')).toContain('pack.zip')
    expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes)
  })

  it('increments install_count on each request', async () => {
    const fx = await insertCreation({
      slug: 'k',
      parts: [{ role: 'function', name: 'F', textContent: 'x' }],
    })
    const part = (await getDb().query.stockPart.findFirst({
      where: (p, { eq }) => eq(p.versionId, fx.versionId),
    }))!
    await testApp()(`/v1/stock/k/versions/1/parts/${part.id}/raw`)
    await testApp()(`/v1/stock/k/versions/1/parts/${part.id}/raw`)
    const c = (await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, fx.id),
    }))!
    expect(c.installCount).toBe(2)
  })

  it('404 when part not found', async () => {
    await insertCreation({
      slug: 'k',
      parts: [{ role: 'function', name: 'F', textContent: 'x' }],
    })
    const r = await testApp()(`/v1/stock/k/versions/1/parts/nope/raw`)
    expect(r.status).toBe(404)
  })

  it('404 when version not published', async () => {
    const fx = await insertCreation({
      slug: 'k',
      parts: [{ role: 'function', name: 'F', textContent: 'x' }],
    })
    await getDb().update(schema.stockVersion).set({ status: 'draft', publishedAt: null }).where(sql`creation_id = ${fx.id}`)
    const part = (await getDb().query.stockPart.findFirst({
      where: (p, { eq }) => eq(p.versionId, fx.versionId),
    }))!
    const r = await testApp()(`/v1/stock/k/versions/1/parts/${part.id}/raw`)
    expect(r.status).toBe(404)
  })
})
