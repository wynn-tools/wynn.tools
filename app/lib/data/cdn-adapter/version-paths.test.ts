import type { VersionEntry } from './version-paths'
import { describe, expect, it } from 'vitest'
import { WYNN_VERSION_LATEST } from '~/lib/codec/version'
import versions from '../__fixtures__/cdn/versions.json'
import { cdnPathFor, resolveVersionSegment } from './version-paths'

const versionEntries = versions as VersionEntry[]

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
    expect(resolveVersionSegment(WYNN_VERSION_LATEST, versionEntries)).toBe('latest')
  })
  it('historical version resolves to the hash from versions.json', () => {
    expect(resolveVersionSegment(9, versionEntries)).toBe('e4872d66') // 2.1.0.1
    expect(resolveVersionSegment(0, versionEntries)).toBe('15db4c69') // 2.0.1.1
  })
  it('throws on unknown version id', () => {
    expect(() => resolveVersionSegment(999, versionEntries)).toThrow()
  })
  it('throws when versions.json has no matching snapshot', () => {
    expect(() => resolveVersionSegment(0, [])).toThrow()
  })
})
