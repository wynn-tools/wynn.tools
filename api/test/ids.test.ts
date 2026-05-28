import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, newResourceId } from '../src/lib/ids'

describe('ids', () => {
  it('generates url-safe resource ids', () => {
    expect(newResourceId()).toMatch(/^[\w-]+$/)
  })

  it('generates an api key whose hash is reproducible', () => {
    const { plaintext, prefix, hash } = generateApiKey()
    expect(plaintext.startsWith('wt_live_')).toBe(true)
    expect(prefix).toBe(plaintext.slice(0, 12))
    expect(hash).toBe(hashApiKey(plaintext))
    expect(hash).not.toContain(plaintext)
  })
})
