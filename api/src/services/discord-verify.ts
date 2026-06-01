import { Buffer } from 'node:buffer'
import { createPublicKey, verify } from 'node:crypto'

const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

export function verifyEd25519(
  rawBody: string,
  signatureHex: string,
  timestamp: string,
  publicKeyHex: string,
): boolean {
  try {
    if (!/^[0-9a-f]+$/i.test(signatureHex) || signatureHex.length !== 128)
      return false
    const keyDer = Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')])
    const key = createPublicKey({ key: keyDer, format: 'der', type: 'spki' })
    const message = Buffer.concat([Buffer.from(timestamp), Buffer.from(rawBody)])
    return verify(null, message, key, Buffer.from(signatureHex, 'hex'))
  }
  catch {
    return false
  }
}
