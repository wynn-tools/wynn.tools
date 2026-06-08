import type { Db } from '../db/client'
import type { WynndleMode } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { wynndleStreaks } from '../db/schema'

function isPrevDay(prev: string, today: string): boolean {
  const d = new Date(`${prev}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10) === today
}

export async function recordResult(
  db: Db,
  userId: string,
  mode: WynndleMode,
  date: string,
  won: boolean,
) {
  const [existing] = await db.select().from(wynndleStreaks).where(and(eq(wynndleStreaks.userId, userId), eq(wynndleStreaks.mode, mode))).limit(1)
  const prev = existing?.lastSolved ?? null
  let current = existing?.current ?? 0
  let longest = existing?.longest ?? 0
  if (!won) {
    current = 0
  }
  else {
    current = prev && isPrevDay(prev, date) ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  await db.insert(wynndleStreaks)
    .values({ userId, mode, current, longest, lastSolved: won ? date : (prev ?? null) })
    .onConflictDoUpdate({
      target: [wynndleStreaks.userId, wynndleStreaks.mode],
      set: { current, longest, lastSolved: won ? date : (prev ?? null), updatedAt: new Date() },
    })
}
