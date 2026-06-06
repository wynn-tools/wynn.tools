import type { CreditsMap, NormalizedBuildImport } from '../shared/types.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

interface BuildDbEntry {
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

export function parseBuildDb(): NormalizedBuildImport[] {
  const raw = readFileSync(resolve(here, 'source.json'), 'utf-8')
  const file = JSON.parse(raw) as BuildDb
  const results: NormalizedBuildImport[] = []

  for (const [key, entry] of Object.entries(file.Builds)) {
    const hash = entry.link.split('#')[1]
    if (!hash)
      continue

    const primaryCredit = (entry.credit ?? '').trim() || 'generic build'
    const tags = entry.tag
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    results.push({
      name: key,
      buildString: hash,
      playerClass: entry.class,
      primaryCredit,
      secondaryCredits: [],
      tags,
      source: 'build-db',
    })
  }

  return results
}

export function loadCredits(): CreditsMap {
  const raw = readFileSync(resolve(here, 'credits.json'), 'utf-8')
  return JSON.parse(raw) as CreditsMap
}

export function validateCredits(
  entries: NormalizedBuildImport[],
  credits: CreditsMap,
): string[] {
  const missing: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const credit = entry.primaryCredit
    if (!seen.has(credit)) {
      seen.add(credit)
      if (!(credit in credits)) {
        missing.push(credit)
      }
    }
  }

  return missing
}
