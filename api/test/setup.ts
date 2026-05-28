import process from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const TEST_DB_URL = 'postgres://wynn:wynn@localhost:5433/wynn_test'

export default async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL
  const pool = new Pool({ connectionString: TEST_DB_URL })
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  await pool.end()
}
