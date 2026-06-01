import { Buffer } from 'node:buffer'
import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyEd25519 } from '../src/services/discord-verify'

function makeKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex')
  return { publicKeyHex, privateKey }
}

function signPayload(privateKey: ReturnType<typeof makeKeypair>['privateKey'], timestamp: string, body: string) {
  return sign(null, Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]), privateKey).toString('hex')
}

describe('verifyEd25519', () => {
  const { publicKeyHex, privateKey } = makeKeypair()
  const timestamp = '1700000000'
  const body = '{"type":1}'
  const signature = signPayload(privateKey, timestamp, body)

  it('accepts a valid signature', () => {
    expect(verifyEd25519(body, signature, timestamp, publicKeyHex)).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(verifyEd25519('{"type":2}', signature, timestamp, publicKeyHex)).toBe(false)
  })

  it('rejects a tampered timestamp', () => {
    expect(verifyEd25519(body, signature, '1700000001', publicKeyHex)).toBe(false)
  })

  it('rejects with a different public key', () => {
    const other = makeKeypair().publicKeyHex
    expect(verifyEd25519(body, signature, timestamp, other)).toBe(false)
  })

  it('rejects a malformed signature', () => {
    expect(verifyEd25519(body, 'not-hex', timestamp, publicKeyHex)).toBe(false)
  })
})
