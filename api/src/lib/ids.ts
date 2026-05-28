import { createHash } from 'node:crypto'
import { customAlphabet, nanoid } from 'nanoid'

const keyBody = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)

export function newResourceId(): string {
  return nanoid(12)
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateApiKey(): { plaintext: string, prefix: string, hash: string } {
  const plaintext = `wt_live_${keyBody()}`
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashApiKey(plaintext) }
}
