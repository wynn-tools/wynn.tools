import type { VersionEntry } from './version-paths'
import { describe, expect, it } from 'vitest'
import versions from '../__fixtures__/cdn/versions.json'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from './version-paths'

const versionEntries = versions as VersionEntry[]

describe('cdnPathFor', () => {
  it('joins segment and file under data/', () => {
    expect(cdnPathFor('2.2.0.31', 'items.json')).toBe('data/2.2.0.31/items.json')
  })
  it('builds per-class atree paths', () => {
    expect(cdnPathFor('2.2.0.31', 'atree/archer.json')).toBe('data/2.2.0.31/atree/archer.json')
  })
})

describe('resolveVersionSegment', () => {
  it('versionId 0 resolves to the anchor gameVersion', () => {
    expect(resolveVersionSegment(0, versionEntries)).toBe('2.0.1.1')
  })
  it('historical versionId resolves by anchor offset', () => {
    expect(resolveVersionSegment(9, versionEntries)).toBe('2.1.0.1')
    expect(resolveVersionSegment(30, versionEntries)).toBe('2.2.0.31')
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
  it('points at the newest version-tagged snapshot, skipping a trailing untagged one', () => {
    // The fixture's final entry has no gameVersion (freshly fetched, untagged),
    // so the newest servable snapshot is the one before it: 2.2.0.31.
    const id = latestVersionId(versionEntries)
    expect(resolveVersionSegment(id, versionEntries)).toBe('2.2.0.31')
  })
  it('throws when no snapshot has a gameVersion', () => {
    expect(() => latestVersionId([{ hash: 'x', gameVersion: null, fetchedAt: null }])).toThrow()
  })
})
