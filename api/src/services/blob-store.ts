import type { Buffer } from 'node:buffer'
import type { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { env } from '../env'
import { sha256Hex } from '../lib/sha256'

const SHA_RE = /^[0-9a-f]{64}$/

export function blobPath(sha256: string): string {
  if (!SHA_RE.test(sha256))
    throw new Error(`invalid sha256: ${sha256}`)
  return join(env().UPLOAD_DIR, sha256.slice(0, 2), sha256)
}

export async function writeBlob(buf: Buffer): Promise<{ sha256: string, byteSize: number }> {
  const sha256 = sha256Hex(buf)
  const target = blobPath(sha256)
  await mkdir(dirname(target), { recursive: true })
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmp, buf)
  await rename(tmp, target)
  return { sha256, byteSize: buf.length }
}

export function readBlobStream(sha256: string): Readable {
  return createReadStream(blobPath(sha256))
}

export async function deleteBlob(sha256: string): Promise<void> {
  await rm(blobPath(sha256), { force: true })
}
