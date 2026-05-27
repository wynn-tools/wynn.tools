import { describe, expect, it } from 'vitest'
import { WYNN_VERSION_LATEST, WYNN_VERSION_NAMES } from '~/lib/codec/version'
import { cdnPathFor, resolveVersionSegment, VERSION_HASHES } from './version-paths'

describe('cdnPathFor', () => {
  it('joins segment and file', () => {
    expect(cdnPathFor('latest', 'items.json')).toBe('latest/items.json')
  })
  it('builds per-class atree paths', () => {
    expect(cdnPathFor('latest', 'atree/archer.json')).toBe('latest/atree/archer.json')
  })
})

describe('resolveVersionSegment', () => {
  it('newest version uses latest redirect', () => {
    expect(resolveVersionSegment(WYNN_VERSION_LATEST)).toBe('latest')
  })
  it('historical version resolves to its content hash', () => {
    expect(resolveVersionSegment(9)).toBe('e4872d66') // 2.1.0.1
    expect(resolveVersionSegment(0)).toBe('15db4c69') // 2.0.1.1
  })
  it('throws on unknown version id', () => {
    expect(() => resolveVersionSegment(999)).toThrow()
  })
})

describe('versionHashes sanity check', () => {
  it('has same length as WYNN_VERSION_NAMES', () => {
    expect(VERSION_HASHES.length).toBe(WYNN_VERSION_NAMES.length)
  })
})
