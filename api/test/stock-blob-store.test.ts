import { Buffer } from 'node:buffer'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { beforeAll, describe, expect, it } from 'vitest'
import { resetEnvCache } from '../src/env'
import { blobPath, deleteBlob, readBlobStream, writeBlob } from '../src/services/blob-store'

const TMP = mkdtempSync(join(tmpdir(), 'blob-'))

beforeAll(() => {
  process.env.UPLOAD_DIR = TMP
  resetEnvCache()
})

describe('blob-store', () => {
  it('writes a buffer to a sharded sha256 path', async () => {
    const buf = Buffer.from('hello world')
    const { sha256, byteSize } = await writeBlob(buf)
    expect(sha256).toHaveLength(64)
    expect(byteSize).toBe(buf.length)
    expect(existsSync(blobPath(sha256))).toBe(true)
    expect(readFileSync(blobPath(sha256))).toEqual(buf)
  })

  it('is idempotent on re-write', async () => {
    const buf = Buffer.from('twice')
    const a = await writeBlob(buf)
    const b = await writeBlob(buf)
    expect(a.sha256).toBe(b.sha256)
  })

  it('streams reads', async () => {
    const buf = Buffer.from('streamy')
    const { sha256 } = await writeBlob(buf)
    const chunks: Buffer[] = []
    for await (const c of readBlobStream(sha256))
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    expect(Buffer.concat(chunks)).toEqual(buf)
  })

  it('deletes', async () => {
    const buf = Buffer.from('gone')
    const { sha256 } = await writeBlob(buf)
    await deleteBlob(sha256)
    expect(existsSync(blobPath(sha256))).toBe(false)
    await deleteBlob(sha256)
  })

  it('rejects bad sha shapes', () => {
    expect(() => blobPath('../etc/passwd')).toThrow()
    expect(() => blobPath('ABCDEF')).toThrow()
    expect(() => blobPath('z'.repeat(64))).toThrow()
  })
})
