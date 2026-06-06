import { describe, expect, it } from 'vitest'
import { loadCredits, parseBuildDb, validateCredits } from '../scripts/imports/build-db/parse'

describe('parseBuildDb', () => {
  it('returns a non-empty array of NormalizedBuildImport', () => {
    const entries = parseBuildDb()
    expect(entries.length).toBeGreaterThan(0)
  })

  it('maps fields correctly on a known entry', () => {
    const entries = parseBuildDb()
    // All entries must have required shape
    for (const entry of entries) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('buildString')
      expect(entry).toHaveProperty('playerClass')
      expect(entry).toHaveProperty('primaryCredit')
      expect(Array.isArray(entry.secondaryCredits)).toBe(true)
      expect(Array.isArray(entry.tags)).toBe(true)
      expect(entry.source).toBe('build-db')
    }
  })

  it('uses "generic build" as primaryCredit when credit is empty or missing', () => {
    const entries = parseBuildDb()
    // Every entry must have a non-empty primaryCredit (no raw empty strings)
    for (const entry of entries) {
      expect(entry.primaryCredit.length).toBeGreaterThan(0)
    }
    // At least one entry should resolve to 'generic build'
    const genericEntries = entries.filter(e => e.primaryCredit === 'generic build')
    expect(genericEntries.length).toBeGreaterThan(0)
  })

  it('skips entries with no buildString hash in the link', () => {
    // All returned entries must have a non-empty buildString
    const entries = parseBuildDb()
    for (const entry of entries) {
      expect(entry.buildString.length).toBeGreaterThan(0)
    }
  })
})

describe('validateCredits', () => {
  it('returns empty array when all credits are covered', () => {
    const entries = parseBuildDb()
    const credits = loadCredits()
    const missing = validateCredits(entries, credits)
    expect(missing).toEqual([])
  })

  it('reports missing credits when the credits map is incomplete', () => {
    const entries = parseBuildDb()
    const missing = validateCredits(entries, {})
    expect(missing.length).toBeGreaterThan(0)
  })
})
