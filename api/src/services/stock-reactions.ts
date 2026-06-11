import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

const EMOJIS = ['thumbs_up', 'fire', 'art', 'bug'] as const
export type StockEmoji = (typeof EMOJIS)[number]
export function isStockEmoji(s: string): s is StockEmoji {
  return (EMOJIS as readonly string[]).includes(s)
}

export type Counts = Record<StockEmoji, number>

export async function toggleReaction(
  creationId: string,
  userId: string,
  emoji: StockEmoji,
): Promise<Counts> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const existing = await tx.query.stockReaction.findFirst({
      where: (r, { and, eq }) => and(
        eq(r.userId, userId),
        eq(r.creationId, creationId),
        eq(r.emoji, emoji),
      ),
      columns: { userId: true },
    })
    let added = false
    if (existing) {
      await tx.delete(schema.stockReaction).where(and(
        eq(schema.stockReaction.userId, userId),
        eq(schema.stockReaction.creationId, creationId),
        eq(schema.stockReaction.emoji, emoji),
      ))
    }
    else {
      await tx.insert(schema.stockReaction).values({ userId, creationId, emoji })
      added = true
    }
    const rows = await tx
      .select({ emoji: schema.stockReaction.emoji, n: sql<number>`count(*)::int` })
      .from(schema.stockReaction)
      .where(eq(schema.stockReaction.creationId, creationId))
      .groupBy(schema.stockReaction.emoji)
    const counts: Counts = { thumbs_up: 0, fire: 0, art: 0, bug: 0 }
    for (const r of rows) counts[r.emoji as StockEmoji] = r.n
    const total = counts.thumbs_up + counts.fire + counts.art + counts.bug
    const patch: { reactionCounts: object, lastActivityAt?: Date } = {
      reactionCounts: { ...counts, total },
    }
    if (added)
      patch.lastActivityAt = new Date()
    await tx.update(schema.stockCreation)
      .set(patch)
      .where(eq(schema.stockCreation.id, creationId))
    return counts
  })
}
