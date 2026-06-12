import { Buffer } from 'node:buffer'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { resetEnvCache } from '../src/env'
import { writeBlob } from '../src/services/blob-store'
import { createDraftCreation, replaceMedia } from '../src/services/stock-write'
import { makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'

const TMP = mkdtempSync(join(tmpdir(), 'media-svc-'))

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

async function makeZipBlob(): Promise<string> {
  const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0])
  const { sha256, byteSize } = await writeBlob(buf)
  await getDb().insert(schema.stockBlob).values({
    sha256,
    byteSize,
    mimeType: 'application/zip',
    originalFilename: 'x.zip',
    refCount: 0,
  }).onConflictDoNothing()
  return sha256
}

async function makeCreation() {
  const u = await makeUserWithSession()
  return await createDraftCreation({
    userId: u.id,
    title: 'T',
    kind: 'infobox',
    category: 'qol',
    classes: [],
  })
}

describe('replaceMedia', () => {
  beforeEach(resetDb)

  it('inserts rows in order', async () => {
    const { id } = await makeCreation()
    const a = await makeImageBlob(1)
    const b = await makeImageBlob(2)
    await replaceMedia(id, [
      { blobSha256: a, caption: 'first' },
      { blobSha256: b, caption: null },
    ])
    const rows = await getDb().query.stockMedia.findMany({
      where: (m, { eq }) => eq(m.creationId, id),
      orderBy: (m, { asc }) => [asc(m.order)],
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].blobSha256).toBe(a)
    expect(rows[0].caption).toBe('first')
    expect(rows[0].order).toBe(0)
    expect(rows[1].blobSha256).toBe(b)
    expect(rows[1].order).toBe(1)
  })

  it('diffs refcount on add and remove', async () => {
    const { id } = await makeCreation()
    const a = await makeImageBlob(1)
    const b = await makeImageBlob(2)
    await replaceMedia(id, [{ blobSha256: a, caption: null }])
    let blobs = await getDb().query.stockBlob.findMany()
    expect(blobs.find(x => x.sha256 === a)!.refCount).toBe(1)
    expect(blobs.find(x => x.sha256 === b)!.refCount).toBe(0)
    await replaceMedia(id, [{ blobSha256: b, caption: null }])
    blobs = await getDb().query.stockBlob.findMany()
    expect(blobs.find(x => x.sha256 === a)!.refCount).toBe(0)
    expect(blobs.find(x => x.sha256 === b)!.refCount).toBe(1)
  })

  it('no-op when sha set unchanged keeps refcount stable', async () => {
    const { id } = await makeCreation()
    const a = await makeImageBlob(1)
    await replaceMedia(id, [{ blobSha256: a, caption: 'x' }])
    await replaceMedia(id, [{ blobSha256: a, caption: 'y' }])
    const blob = (await getDb().query.stockBlob.findMany()).find(x => x.sha256 === a)!
    expect(blob.refCount).toBe(1)
  })

  it('empty array clears media and decrements refcount', async () => {
    const { id } = await makeCreation()
    const a = await makeImageBlob(1)
    await replaceMedia(id, [{ blobSha256: a, caption: null }])
    await replaceMedia(id, [])
    const blob = (await getDb().query.stockBlob.findMany()).find(x => x.sha256 === a)!
    expect(blob.refCount).toBe(0)
    expect(await getDb().query.stockMedia.findMany()).toHaveLength(0)
  })

  it('rejects more than 8 items', async () => {
    const { id } = await makeCreation()
    const shas = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map(makeImageBlob))
    await expect(replaceMedia(id, shas.map(s => ({ blobSha256: s, caption: null }))))
      .rejects
      .toMatchObject({ code: 'bad_media' })
  })

  it('rejects non-image blob', async () => {
    const { id } = await makeCreation()
    const z = await makeZipBlob()
    await expect(replaceMedia(id, [{ blobSha256: z, caption: null }]))
      .rejects
      .toMatchObject({ code: 'bad_media' })
  })

  it('rejects missing blob', async () => {
    const { id } = await makeCreation()
    await expect(replaceMedia(id, [{ blobSha256: 'a'.repeat(64), caption: null }]))
      .rejects
      .toMatchObject({ code: 'bad_media' })
  })

  it('rejects caption over 200 chars', async () => {
    const { id } = await makeCreation()
    const a = await makeImageBlob(1)
    await expect(replaceMedia(id, [{ blobSha256: a, caption: 'x'.repeat(201) }]))
      .rejects
      .toMatchObject({ code: 'bad_media' })
  })

  it('advances updatedAt and lastActivityAt', async () => {
    const { id } = await makeCreation()
    const before = (await getDb().query.stockCreation.findFirst({ where: (c, { eq }) => eq(c.id, id) }))!
    await new Promise(r => setTimeout(r, 5))
    const a = await makeImageBlob(1)
    await replaceMedia(id, [{ blobSha256: a, caption: null }])
    const after = (await getDb().query.stockCreation.findFirst({ where: (c, { eq }) => eq(c.id, id) }))!
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
    expect(after.lastActivityAt.getTime()).toBeGreaterThan(before.lastActivityAt.getTime())
  })
})
