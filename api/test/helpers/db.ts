import { sql } from 'drizzle-orm'
import { getDb } from '../../src/db/client'

export async function resetDb() {
  const db = getDb()
  await db.execute(
    sql`TRUNCATE users, sessions, builds, crafted_items, api_keys, market_price_cache RESTART IDENTITY CASCADE`,
  )
}
