/**
 * Re-encode user-created builds after the CDN realigned the 2.2.1.0–2.2.5.0
 * ability trees with wynnbuilder (cdn.wynn.tools `scripts/align-atree.ts`).
 *
 * A build string encoded against the old tree structure decodes to the wrong
 * nodes (or throws) against the new one. Each build on a realigned snapshot is
 * decoded with that snapshot's `atree-legacy.json` and re-encoded with the
 * current tree. Imported builds (`source` set) came from wynnbuilder links,
 * which already use the aligned structure, so they are skipped.
 *
 * Dry run by default. `--apply` writes a JSON backup of every changed row to
 * the working directory, then updates the rows in one transaction.
 *
 * Usage:
 *   pnpm tsx --env-file=.env src/scripts/migrate-atree-alignment.ts [--apply]
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { eq, isNull } from 'drizzle-orm'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { encodeRawBuild } from '~/lib/codec/build-codec'
import { createCdnClient, decodeRawBuild, fetchLegacyAtree, loadBuildContext, peekVersionId, slotItemId, WEP_TO_CLASS } from '../build-core'
import { getDb } from '../db/client'
import { builds } from '../db/schema'
import { env } from '../env'

const WEAPON_RECIPE_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

async function main() {
  const apply = process.argv.includes('--apply')
  const client = createCdnClient(env().CDN_BASE_URL)
  const db = getDb()
  const rows = await db.select({ id: builds.id, buildString: builds.buildString }).from(builds).where(isNull(builds.source))
  const changes: Array<{ id: string, from: string, to: string }> = []
  const failures: Array<{ id: string, error: string }> = []

  for (const row of rows) {
    try {
      const loaded = await loadBuildContext(client, peekVersionId(row.buildString))
      const legacy = await fetchLegacyAtree(client, loaded.gameVersion)
      if (!legacy)
        continue
      const recipes = loaded.ctx.craftContext?.recipes
      const raw = decodeRawBuild(row.buildString, () => ({
        enc: loaded.enc,
        atreeData: legacy,
        weaponType: loaded.weaponType,
        recipeIsWeapon: (id: number) => WEAPON_RECIPE_TYPES.has(recipes?.get(id)?.type ?? ''),
      }))
      const weaponId = slotItemId(raw.equipment[8])
      const wt = weaponId === null ? null : loaded.weaponType(weaponId)
      const cls = wt ? WEP_TO_CLASS[wt] : undefined
      if (!cls)
        continue
      const next = encodeRawBuild(raw, loaded.enc, getSortedClassAtree(loaded.ctx.atreeData, cls))
      if (next !== row.buildString)
        changes.push({ id: row.id, from: row.buildString, to: next })
    }
    catch (err) {
      failures.push({ id: row.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  console.log(`${rows.length} user builds scanned, ${changes.length} need re-encoding, ${failures.length} could not be decoded`)
  for (const c of changes)
    console.log(`  ${c.id}: ${c.from} -> ${c.to}`)
  for (const f of failures)
    console.log(`  FAILED ${f.id}: ${f.error}`)

  if (!apply || changes.length === 0)
    process.exit(0)
  const backup = resolve(`builds-atree-backup-${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(backup, JSON.stringify(changes, null, 2))
  console.log(`backup written to ${backup}`)
  await db.transaction(async (tx) => {
    for (const c of changes)
      await tx.update(builds).set({ buildString: c.to }).where(eq(builds.id, c.id))
  })
  console.log(`updated ${changes.length} builds`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
