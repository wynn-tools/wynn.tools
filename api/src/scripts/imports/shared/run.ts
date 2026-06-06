import type { CreditsMap, NormalizedBuildImport } from './types'
import { sql } from 'drizzle-orm'
import { getDb, schema } from '../../../db/client'
import { newResourceId } from '../../../lib/ids'
import { detectGameVersion } from './detect-game-version'
import { makeCreditResolver } from './resolve-credits'

export async function runImport(opts: {
  source: 'build-db' | 'sugvon'
  entries: NormalizedBuildImport[]
  credits: CreditsMap
}) {
  const db = getDb()
  const existingRows = await db.execute<{ build_string: string }>(
    sql`SELECT build_string FROM builds WHERE source = ${opts.source}`,
  )
  const alreadyImported = new Set(existingRows.rows.map(r => r.build_string))

  const resolve = makeCreditResolver(opts.source, opts.credits)
  let inserted = 0
  let skipped = 0
  let existing = 0

  for (const entry of opts.entries) {
    if (alreadyImported.has(entry.buildString)) {
      existing++
      continue
    }
    const version = await detectGameVersion(entry.buildString)
    if (!version) {
      console.warn(`[skip] ${entry.name}: could not detect game version`)
      skipped++
      continue
    }
    const primary = await resolve(entry.primaryCredit)
    const secondaries = await Promise.all(entry.secondaryCredits.map(resolve))

    const buildId = newResourceId()
    await db.insert(schema.builds).values({
      id: buildId,
      userId: primary,
      name: entry.name,
      buildString: entry.buildString,
      gameVersion: version,
      visibility: 'public',
      playerClass: entry.playerClass,
      source: opts.source,
      tags: entry.tags.length ? entry.tags : null,
      tutorialUrl: entry.tutorialUrl ?? null,
      notes: entry.notes ?? null,
    })
    for (let i = 0; i < secondaries.length; i++) {
      // Skip self-credit (primary === secondary)
      if (secondaries[i] === primary)
        continue
      await db.insert(schema.buildCredits).values({
        buildId,
        userId: secondaries[i]!,
        position: i,
      })
    }
    inserted++
  }
  console.log(`Imported ${inserted} builds (skipped ${skipped}, already present ${existing})`)
}
