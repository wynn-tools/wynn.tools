import type { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}
