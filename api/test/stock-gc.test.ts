import { Buffer } from 'node:buffer'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { resetEnvCache } from '../src/env'
import { blobPath, writeBlob } from '../src/services/blob-store'
import { gcOrphanBlobs } from '../src/services/stock-gc'
import { resetDb } from './helpers/db'

const TMP = mkdtempSync(join(tmpdir(), 'gc-'))
beforeAll(() => {
  process.env.UPLOAD_DIR = TMP
  resetEnvCache()
})

describe('gcOrphanBlobs', () => {
  beforeEach(resetDb)

  it('deletes refCount=0 rows older than threshold and their files', async () => {
    const { sha256 } = await writeBlob(Buffer.from('zero'))
    await getDb().insert(schema.stockBlob).values({
      sha256,
      byteSize: 4,
      mimeType: 'image/png',
      originalFilename: 'x',
      refCount: 0,
    })
    await getDb().update(schema.stockBlob).set({ createdAt: new Date('2000-01-01') }).where(sql`sha256 = ${sha256}`)
    const r = await gcOrphanBlobs({ olderThanMs: 0 })
    expect(r.deleted).toBe(1)
    expect(existsSync(blobPath(sha256))).toBe(false)
  })

  it('keeps referenced blobs', async () => {
    const { sha256 } = await writeBlob(Buffer.from('ref'))
    await getDb().insert(schema.stockBlob).values({
      sha256,
      byteSize: 3,
      mimeType: 'image/png',
      originalFilename: 'x',
      refCount: 1,
    })
    const r = await gcOrphanBlobs({ olderThanMs: 0 })
    expect(r.deleted).toBe(0)
    expect(existsSync(blobPath(sha256))).toBe(true)
  })

  it('keeps recently-uploaded blobs even if refCount=0', async () => {
    const { sha256 } = await writeBlob(Buffer.from('young'))
    await getDb().insert(schema.stockBlob).values({
      sha256,
      byteSize: 5,
      mimeType: 'image/png',
      originalFilename: 'x',
      refCount: 0,
    })
    const r = await gcOrphanBlobs({ olderThanMs: 24 * 3600 * 1000 })
    expect(r.deleted).toBe(0)
  })
})
