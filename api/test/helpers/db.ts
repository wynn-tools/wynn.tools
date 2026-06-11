import { sql } from 'drizzle-orm'
import { getDb } from '../../src/db/client'

export async function resetDb() {
  const db = getDb()
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_creation') THEN
        EXECUTE 'TRUNCATE
          stock_admin_audit_log, stock_report, stock_reaction, stock_credit,
          stock_media, stock_part, stock_version, stock_creation, stock_blob
        RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `)
  await db.execute(
    sql`TRUNCATE users, sessions, builds, crafted_items, api_keys, market_price_cache, og_image_cache RESTART IDENTITY CASCADE`,
  )
}
