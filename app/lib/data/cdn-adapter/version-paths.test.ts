import type { VersionEntry } from './version-paths'
import { describe, expect, it } from 'vitest'
import { ENCODING_BASE_VERSION } from '~/lib/codec/version'
import versions from '../__fixtures__/cdn/versions.json'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from './version-paths'

const versionEntries = versions as VersionEntry[]
const anchorIdx = versionEntries.findIndex(v => v.gameVersion === ENCODING_BASE_VERSION)

describe('cdnPathFor', () => {
  it('joins segment and file under data/', () => {
    expect(cdnPathFor('a3f82c91', 'items.json')).toBe('data/a3f82c91/items.json')
  })
  it('builds per-class atree paths', () => {
    expect(cdnPathFor('a3f82c91', 'atree/archer.json')).toBe('data/a3f82c91/atree/archer.json')
  })
})

describe('resolveVersionSegment', () => {
  it('versionId 0 resolves to the anchor version hash', () => {
    expect(resolveVersionSegment(0, versionEntries)).toBe('15db4c69') // 2.0.1.1
  })
  it('historical versionId resolves by anchor offset', () => {
    expect(resolveVersionSegment(9, versionEntries)).toBe('e4872d66') // 2.1.0.1
    expect(resolveVersionSegment(30, versionEntries)).toBe('7a3e636e') // 2.2.0.31
  })
  it('throws on negative versionId', () => {
    expect(() => resolveVersionSegment(-1, versionEntries)).toThrow()
  })
  it('throws on out-of-range versionId', () => {
    expect(() => resolveVersionSegment(9999, versionEntries)).toThrow()
  })
  it('throws when versions.json lacks the anchor', () => {
    expect(() => resolveVersionSegment(0, [])).toThrow(/anchor/)
  })
})

describe('latestVersionId', () => {
  it('points at the newest snapshot', () => {
    const id = latestVersionId(versionEntries)
    expect(id).toBe(versionEntries.length - 1 - anchorIdx)
    expect(resolveVersionSegment(id, versionEntries)).toBe(versionEntries[versionEntries.length - 1]!.hash)
  })
})
