import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { sniffImageMime } from '../src/services/stock-image-guard'

describe('sniffImageMime', () => {
  it('detects png', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])
    expect(sniffImageMime(png)).toBe('image/png')
  })
  it('detects jpeg', () => {
    const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0])
    expect(sniffImageMime(jpg)).toBe('image/jpeg')
  })
  it('detects gif87a / gif89a', () => {
    expect(sniffImageMime(Buffer.from('GIF87a    '))).toBe('image/gif')
    expect(sniffImageMime(Buffer.from('GIF89a    '))).toBe('image/gif')
  })
  it('detects webp', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4, 0), Buffer.from('WEBP')])
    expect(sniffImageMime(webp)).toBe('image/webp')
  })
  it('returns null for non-image', () => {
    expect(sniffImageMime(Buffer.from('hello world'))).toBeNull()
  })
})
