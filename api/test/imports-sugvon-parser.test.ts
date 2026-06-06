import { describe, expect, it } from 'vitest'
import { loadCredits, parseSugvon, validateCredits } from '../scripts/imports/sugvon/parse'

describe('parseSugvon', () => {
  it('produces more than 50 entries after variant flattening', () => {
    const entries = parseSugvon()
    expect(entries.length).toBeGreaterThan(50)
  })

  it('all entries have the required NormalizedBuildImport shape', () => {
    const entries = parseSugvon()
    for (const entry of entries) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('buildString')
      expect(entry).toHaveProperty('playerClass')
      expect(entry).toHaveProperty('primaryCredit')
      expect(Array.isArray(entry.secondaryCredits)).toBe(true)
      expect(Array.isArray(entry.tags)).toBe(true)
      expect(entry.source).toBe('sugvon')
    }
  })

  it('single-variant entries have bare names with no parenthetical suffix', () => {
    const entries = parseSugvon()
    // Convergence only has one variant — it should not get a "(label)" suffix
    const convergence = entries.find(e => e.name === 'Convergence - Fallen Bash Cut')
    expect(convergence).toBeDefined()
    expect(convergence!.name).not.toMatch(/\(/)
  })

  it('flattens multi-variant builds with disambiguated names', () => {
    const entries = parseSugvon()
    // Idol - Surf has three variants: Non Crafted, Crafted, Lootrun Variant
    const idolNonCrafted = entries.find(e => e.name === 'Idol - Surf (Non Crafted)')
    const idolCrafted = entries.find(e => e.name === 'Idol - Surf (Crafted)')
    const idolLootrun = entries.find(e => e.name === 'Idol - Surf (Lootrun Variant)')
    expect(idolNonCrafted).toBeDefined()
    expect(idolCrafted).toBeDefined()
    expect(idolLootrun).toBeDefined()
  })

  it('parses "By X and Y" as primaryCredit + secondaryCredits[0]', () => {
    const entries = parseSugvon()
    // Idol - Surf (Non Crafted): "Non Crafted Build By helmp and Wanfei"
    const entry = entries.find(e => e.name === 'Idol - Surf (Non Crafted)')
    expect(entry).toBeDefined()
    expect(entry!.primaryCredit).toBe('helmp')
    expect(entry!.secondaryCredits).toContain('Wanfei')
  })

  it('handles three-person credits separated by commas and "and"', () => {
    const entries = parseSugvon()
    // Ascendancy - Paladin Big Mac (Non Crafted): "Non Crafted Build by Asthae, Pandamonium and me"
    const entry = entries.find(e => e.name === 'Ascendancy - Paladin Big Mac (Non Crafted)')
    expect(entry).toBeDefined()
    expect(entry!.primaryCredit).toBe('Asthae')
    expect(entry!.secondaryCredits).toContain('Pandamonium')
    expect(entry!.secondaryCredits).toContain('me')
  })

  it('assigns per-variant credits correctly', () => {
    const entries = parseSugvon()
    // Idol - Surf (Lootrun Variant): "Lootrun Build By me"
    const lootrun = entries.find(e => e.name === 'Idol - Surf (Lootrun Variant)')
    expect(lootrun).toBeDefined()
    expect(lootrun!.primaryCredit).toBe('me')

    // Idol - Surf (Crafted): "Crafted Build By mflr and helmp"
    const crafted = entries.find(e => e.name === 'Idol - Surf (Crafted)')
    expect(crafted).toBeDefined()
    expect(crafted!.primaryCredit).toBe('mflr')
    expect(crafted!.secondaryCredits).toContain('helmp')
  })

  it('extracts tutorial URL', () => {
    const entries = parseSugvon()
    const convergence = entries.find(e => e.name === 'Convergence - Fallen Bash Cut')
    expect(convergence).toBeDefined()
    expect(convergence!.tutorialUrl).toBe('https://youtu.be/BctgACKhU7I')
  })

  it('extracts Uses: tags', () => {
    const entries = parseSugvon()
    const convergence = entries.find(e => e.name === 'Convergence - Fallen Bash Cut')
    expect(convergence).toBeDefined()
    expect(convergence!.tags).toContain('TNA')
    expect(convergence!.tags).toContain('TCC')
    expect(convergence!.tags).toContain('NOL')
    expect(convergence!.tags).toContain('NOTG')
    expect(convergence!.tags).toContain('WTP')
  })

  it('captures notes lines', () => {
    const entries = parseSugvon()
    // Trance has a note: "Crusade Sabatons can be swapped for Dimacheaus for more damage"
    const trance = entries.find(e => e.name === 'Trance - Riftwalker Melee')
    expect(trance).toBeDefined()
    expect(trance!.notes).toContain('Crusade Sabatons can be swapped for Dimacheaus for more damage')
  })

  it('does not capture truncated URLs as build strings', () => {
    const entries = parseSugvon()
    // No buildString should contain "..." (truncated display label)
    for (const entry of entries) {
      expect(entry.buildString).not.toContain('...')
      // All build strings should be reasonably long (actual encoded builds are > 10 chars)
      expect(entry.buildString.length).toBeGreaterThan(10)
    }
  })

  it('does not use youtube URLs as build strings', () => {
    const entries = parseSugvon()
    for (const entry of entries) {
      expect(entry.buildString).not.toContain('youtu.be')
      expect(entry.buildString).not.toContain('youtube.com')
    }
  })

  it('extracts the full URL from parenthesized link, not the truncated label', () => {
    const entries = parseSugvon()
    // Bloodbath crafted has a truncated label URL but full URL in parens
    const crafted = entries.find(e => e.name === 'Bloodbath - Generalist Fallen Burst (Crafted)')
    expect(crafted).toBeDefined()
    // The full build string should be much longer than any truncated label would suggest
    expect(crafted!.buildString.length).toBeGreaterThan(30)
  })

  it('resolves "me" and "Me" as the SugVon author credit', () => {
    const entries = parseSugvon()
    // At least one entry should have primaryCredit of "me" (lowercase)
    const meEntry = entries.find(e => e.primaryCredit === 'me' || e.primaryCredit === 'Me')
    expect(meEntry).toBeDefined()
  })
})

describe('validateCredits', () => {
  it('returns empty array when credits.json covers all observed credits', () => {
    const entries = parseSugvon()
    const credits = loadCredits()
    const missing = validateCredits(entries, credits)
    expect(missing).toEqual([])
  })

  it('reports missing credits when the credits map is incomplete', () => {
    const entries = parseSugvon()
    const missing = validateCredits(entries, {})
    expect(missing.length).toBeGreaterThan(0)
  })

  it('credits.json maps "me" to sugvon-sv handle', () => {
    const credits = loadCredits()
    expect(credits.me).toBeDefined()
    expect(credits.me.handle).toBe('sugvon-sv')
  })

  it('credits.json maps "Me" (capitalized) to sugvon-sv handle', () => {
    const credits = loadCredits()
    expect(credits.Me).toBeDefined()
    expect(credits.Me.handle).toBe('sugvon-sv')
  })

  it('all credit entries have kind person or anonymous', () => {
    const credits = loadCredits()
    for (const [, entry] of Object.entries(credits)) {
      expect(['person', 'anonymous']).toContain(entry.kind)
    }
  })
})
