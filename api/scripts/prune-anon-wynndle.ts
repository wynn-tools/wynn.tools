import process from 'node:process'
import { sql } from 'drizzle-orm'
import { getDb } from '../src/db/client'
import { wynndleRounds } from '../src/db/schema'

async function main() {
  const db = getDb()
  const result = await db.delete(wynndleRounds)
    .where(sql`${wynndleRounds.userId} is null and ${wynndleRounds.startedAt} < now() - interval '30 days'`)
    .returning({ id: wynndleRounds.id })
  console.log(`deleted ${result.length} anonymous wynndle rounds`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
