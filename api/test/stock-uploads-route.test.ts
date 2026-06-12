import { Buffer } from 'node:buffer'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import AdmZip from 'adm-zip'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../src/db/client'
import { env, resetEnvCache } from '../src/env'
import { testApp } from './helpers/app'
import { makeBearer, makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'

const TMP = mkdtempSync(join(tmpdir(), 'uploads-'))

beforeAll(() => {
  process.env.UPLOAD_DIR = TMP
  resetEnvCache()
})

function pngBytes(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0])
}

function zipBytes(): Buffer {
  const z = new AdmZip()
  z.addFile('pack.mcmeta', Buffer.from('{}'))
  return z.toBuffer()
}

async function postUpload(
  call: ReturnType<typeof testApp>,
  file: Buffer,
  name: string,
  headers: Record<string, string>,
) {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(file)]), name)
  return call('/v1/stock/uploads', {
    method: 'POST',
    body: form,
    headers: { Origin: env().FRONTEND_URL, ...headers },
  })
}

describe('pOST /v1/stock/uploads', () => {
  beforeEach(resetDb)

  it('401 when unauthenticated', async () => {
    const r = await postUpload(testApp(), pngBytes(), 'a.png', {})
    expect(r.status).toBe(401)
  })

  it('403 when bearer lacks stock:write', async () => {
    const { header } = await makeBearer({ scopes: ['stock:read'] })
    const r = await postUpload(testApp(), pngBytes(), 'a.png', { Authorization: header })
    expect(r.status).toBe(403)
  })

  it('uploads an image with cookie session', async () => {
    const u = await makeUserWithSession()
    const r = await postUpload(testApp(), pngBytes(), 'cute.png', { Cookie: u.cookie })
    expect(r.status).toBe(200)
    const body = await r.json() as { sha256: string, mimeType: string, byteSize: number }
    expect(body.sha256).toHaveLength(64)
    expect(body.mimeType).toBe('image/png')
    const rows = await getDb().query.stockBlob.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].refCount).toBe(0)
  })

  it('uploads a zip with bearer scope', async () => {
    const { header } = await makeBearer({ scopes: ['stock:write'] })
    const r = await postUpload(testApp(), zipBytes(), 'p.zip', { Authorization: header })
    expect(r.status).toBe(200)
    const body = await r.json() as { mimeType: string }
    expect(body.mimeType).toBe('application/zip')
  })

  it('rejects non-image, non-zip', async () => {
    const u = await makeUserWithSession()
    const r = await postUpload(testApp(), Buffer.from('not anything'), 'x.bin', { Cookie: u.cookie })
    expect(r.status).toBe(415)
  })

  it('records width/height for image uploads', async () => {
    const u = await makeUserWithSession()
    // 8x8 transparent PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4//8/w38GIAXDASc08wAAAABJRU5ErkJggg==',
      'base64',
    )
    const r = await postUpload(testApp(), png, 'a.png', { Cookie: u.cookie })
    expect(r.status).toBe(200)
    const rows = await getDb().query.stockBlob.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].width).toBe(8)
    expect(rows[0].height).toBe(8)
  })

  it('leaves dimensions null for zip uploads', async () => {
    const u = await makeUserWithSession()
    const r = await postUpload(testApp(), zipBytes(), 'p.zip', { Cookie: u.cookie })
    expect(r.status).toBe(200)
    const rows = await getDb().query.stockBlob.findMany()
    expect(rows[0].width).toBeNull()
    expect(rows[0].height).toBeNull()
  })

  it('deduplicates by content hash', async () => {
    const u = await makeUserWithSession()
    const a = await postUpload(testApp(), pngBytes(), 'a.png', { Cookie: u.cookie })
    const b = await postUpload(testApp(), pngBytes(), 'b.png', { Cookie: u.cookie })
    const ab = await a.json() as { sha256: string }
    const bb = await b.json() as { sha256: string }
    expect(ab.sha256).toBe(bb.sha256)
    expect(await getDb().query.stockBlob.findMany()).toHaveLength(1)
  })
})
