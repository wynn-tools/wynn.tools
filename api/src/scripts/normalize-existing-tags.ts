import process from 'node:process'
import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { normalizeTags } from '../lib/build-tags'

type Db = ReturnType<typeof getDb>

export interface NormalizeResult { scanned: number, updated: number, unchanged: number }

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length)
    return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false
  }
  return true
}

export async function runNormalizeExistingTags(db: Db): Promise<NormalizeResult> {
  const rows = await db.select({ id: schema.builds.id, tags: schema.builds.tags })
    .from(schema.builds)
    .where(sql`${schema.builds.tags} IS NOT NULL AND cardinality(${schema.builds.tags}) > 0`)
  let updated = 0
  let unchanged = 0
  for (const row of rows) {
    const current = row.tags ?? []
    const next = normalizeTags(current)
    if (arraysEqual(current, next)) {
      unchanged++
    }
    else {
      await db.update(schema.builds).set({ tags: next }).where(eq(schema.builds.id, row.id))
      updated++
    }
  }
  return { scanned: rows.length, updated, unchanged }
}

async function main() {
  const result = await runNormalizeExistingTags(getDb())
  console.log(JSON.stringify(result))
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`)
  void main()
