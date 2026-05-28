import { and, eq, isNull } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { generateApiKey, hashApiKey } from '../lib/ids'

export const ALL_SCOPES = ['builds:read', 'builds:write', 'items:read', 'items:write'] as const
export type Scope = (typeof ALL_SCOPES)[number]

export async function createApiKey(userId: string, label: string, scopes: Scope[]) {
  const { plaintext, prefix, hash } = generateApiKey()
  const [record] = await getDb().insert(schema.apiKeys).values({
    userId,
    label,
    keyHash: hash,
    prefix,
    scopes,
  }).returning()
  return { plaintext, record }
}

export async function listApiKeys(userId: string) {
  return getDb().query.apiKeys.findMany({
    where: (k, { eq, isNull, and }) => and(eq(k.userId, userId), isNull(k.revokedAt)),
    columns: { id: true, label: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true },
  })
}

export async function revokeApiKey(userId: string, id: string): Promise<void> {
  await getDb().update(schema.apiKeys).set({ revokedAt: new Date() }).where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, userId)))
}

export async function verifyApiKey(plaintext: string) {
  const hash = hashApiKey(plaintext)
  const db = getDb()
  const row = await db
    .select({ user: schema.users, scopes: schema.apiKeys.scopes, keyId: schema.apiKeys.id })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.users.id, schema.apiKeys.userId))
    .where(and(eq(schema.apiKeys.keyHash, hash), isNull(schema.apiKeys.revokedAt)))
    .limit(1)
  if (!row[0])
    return null
  await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, row[0].keyId))
  return { user: row[0].user, scopes: row[0].scopes as Scope[] }
}
