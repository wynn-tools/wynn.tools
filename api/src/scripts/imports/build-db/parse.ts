import type { CreditsMap, NormalizedBuildImport } from '../shared/types.js'
import { normalizeTags } from '../../../lib/build-tags.js'
import creditsData from './credits.json' with { type: 'json' }
import sourceData from './source.json' with { type: 'json' }

export interface BuildDbEntry {
  tag: string
  link: string
  credit?: string
  weapon?: string
  icon?: string
  class: string
}

interface BuildDb {
  Builds: Record<string, BuildDbEntry>
}

export function normalizeImportEntry(key: string, entry: BuildDbEntry): NormalizedBuildImport | null {
  const hash = entry.link.split('#')[1]
  if (!hash)
    return null

  const rawCredit = (entry.credit ?? '').trim() || 'generic build'
  const parts = rawCredit.split(',').map(s => s.trim()).filter(Boolean)
  const primaryCredit = parts[0] ?? 'generic build'
  const secondaryCredits = parts.slice(1)
  const tags = normalizeTags(entry.tag.split(',').map(s => s.trim()))

  return {
    name: key,
    buildString: hash,
    playerClass: entry.class,
    primaryCredit,
    secondaryCredits,
    tags,
    source: 'build-db',
  }
}

export function parseBuildDb(): NormalizedBuildImport[] {
  const file = sourceData as BuildDb
  const results: NormalizedBuildImport[] = []
  for (const [key, entry] of Object.entries(file.Builds)) {
    const norm = normalizeImportEntry(key, entry)
    if (norm)
      results.push(norm)
  }
  return results
}

export function loadCredits(): CreditsMap {
  return creditsData as CreditsMap
}

export function validateCredits(
  entries: NormalizedBuildImport[],
  credits: CreditsMap,
): string[] {
  const missing: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const allCredits = [entry.primaryCredit, ...entry.secondaryCredits]
    for (const credit of allCredits) {
      if (!seen.has(credit)) {
        seen.add(credit)
        if (!(credit in credits)) {
          missing.push(credit)
        }
      }
    }
  }

  return missing
}
