import { randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await getDb().insert(schema.sessions).values({
    id: token,
    userId,
    expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
  })
  return token
}

export async function getSessionUser(token: string) {
  const db = getDb()
  const row = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, token), gt(schema.sessions.expiresAt, new Date())))
    .limit(1)
  return row[0]?.user ?? null
}

export async function deleteSession(token: string): Promise<void> {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.id, token))
}
