import { sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'

export type Action = 'publish' | 'version-publish' | 'reaction' | 'report'

const POLICIES: Record<Action, { window: number, limit: number }> = {
  'publish': { window: 86_400_000, limit: 3 },
  'version-publish': { window: 86_400_000, limit: 10 },
  'reaction': { window: 60_000, limit: 30 },
  'report': { window: 3_600_000, limit: 5 },
}

function windowStartFor(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs)
}

export async function assertWithin(userId: string, action: Action): Promise<void> {
  const policy = POLICIES[action]
  const ws = windowStartFor(Date.now(), policy.window)
  const db = getDb()
  await db.insert(schema.stockRateBucket)
    .values({ userId, action, windowStart: ws, count: 1 })
    .onConflictDoUpdate({
      target: [
        schema.stockRateBucket.userId,
        schema.stockRateBucket.action,
        schema.stockRateBucket.windowStart,
      ],
      set: { count: sql`${schema.stockRateBucket.count} + 1` },
    })
  const row = await db.query.stockRateBucket.findFirst({
    where: (r, { and, eq }) => and(eq(r.userId, userId), eq(r.action, action), eq(r.windowStart, ws)),
  })
  if ((row?.count ?? 0) > policy.limit)
    throw new AppError(429, 'rate_limited', `${action} limit ${policy.limit} per window`)
}
