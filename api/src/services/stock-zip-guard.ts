import type { Buffer } from 'node:buffer'
import AdmZip from 'adm-zip'

export interface ZipLimits {
  maxCompressed: number
  maxUncompressed: number
}

const ZIP_MAGIC = Buffer.from([0x50, 0x4B, 0x03, 0x04])

export function assertSafeZip(buf: Buffer, limits: ZipLimits): void {
  if (buf.length > limits.maxCompressed)
    throw new Error(`zip compressed size ${buf.length} exceeds cap ${limits.maxCompressed}`)
  if (buf.length < 4 || !buf.subarray(0, 4).equals(ZIP_MAGIC))
    throw new Error('not a zip (bad magic bytes)')

  const z = new AdmZip(buf)
  let totalUncompressed = 0
  for (const entry of z.getEntries()) {
    const name = entry.entryName
    if (name.startsWith('/') || name.includes('..') || name.includes('\0'))
      throw new Error(`unsafe zip entry path: ${name}`)
    totalUncompressed += entry.header.size
    if (totalUncompressed > limits.maxUncompressed)
      throw new Error(`zip uncompressed size exceeds cap ${limits.maxUncompressed}`)
  }
}
