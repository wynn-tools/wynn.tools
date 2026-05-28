import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../env'
import * as schema from './schema'

let pool: Pool | null = null

export function getDb() {
  pool ??= new Pool({ connectionString: env().DATABASE_URL })
  return drizzle(pool, { schema })
}

export type Db = ReturnType<typeof getDb>
export { schema }
