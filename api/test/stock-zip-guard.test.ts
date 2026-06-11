import { Buffer } from 'node:buffer'
import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'
import { assertSafeZip } from '../src/services/stock-zip-guard'

function makeZip(entries: Array<{ name: string, body: string }>) {
  const z = new AdmZip()
  // AdmZip's addFile sanitizes leading `/` and `..` segments. To exercise the
  // guard against zips produced elsewhere, build with safe placeholders and
  // override entryName before serializing.
  for (let i = 0; i < entries.length; i++)
    z.addFile(`__entry_${i}`, Buffer.from(entries[i].body))
  const got = z.getEntries()
  for (let i = 0; i < entries.length; i++)
    got[i].entryName = entries[i].name
  return z.toBuffer()
}

const LIMITS = { maxCompressed: 1 << 20, maxUncompressed: 4 << 20 }

describe('assertSafeZip', () => {
  it('accepts a normal zip', () => {
    const buf = makeZip([{ name: 'pack.mcmeta', body: '{}' }])
    expect(() => assertSafeZip(buf, LIMITS)).not.toThrow()
  })

  it('rejects non-zip magic', () => {
    expect(() => assertSafeZip(Buffer.from('not a zip'), LIMITS)).toThrow(/not a zip/i)
  })

  it('rejects compressed size over cap', () => {
    const buf = makeZip([{ name: 'x', body: 'a' }])
    expect(() => assertSafeZip(buf, { maxCompressed: 10, maxUncompressed: 1000 })).toThrow(/compressed/i)
  })

  it('rejects path traversal', () => {
    const buf = makeZip([{ name: '../evil.txt', body: 'no' }])
    expect(() => assertSafeZip(buf, LIMITS)).toThrow(/path/i)
  })

  it('rejects absolute paths', () => {
    const buf = makeZip([{ name: '/etc/passwd', body: 'no' }])
    expect(() => assertSafeZip(buf, LIMITS)).toThrow(/path/i)
  })

  it('rejects uncompressed total over cap', () => {
    const buf = makeZip([{ name: 'big', body: 'a'.repeat(2000) }])
    expect(() => assertSafeZip(buf, { maxCompressed: 1 << 20, maxUncompressed: 500 })).toThrow(/uncompressed/i)
  })
})
