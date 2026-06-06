import type { CreditsMap } from './types'
import { getDb, schema } from '../../../src/db/client'
import { newResourceId } from '../../../src/lib/ids'

export function makeCreditResolver(
  source: 'build-db' | 'sugvon',
  credits: CreditsMap,
) {
  const cache = new Map<string, string>() // rawCredit -> users.id

  return async function resolve(rawCredit: string): Promise<string> {
    const cached = cache.get(rawCredit)
    if (cached)
      return cached

    const entry = credits[rawCredit]
    if (!entry)
      throw new Error(`Unknown credit '${rawCredit}' in ${source}/credits.json`)

    const sentinelDiscordId = `external:${source}:${entry.handle}`
    const db = getDb()

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.discordId, sentinelDiscordId),
    })
    if (existing) {
      cache.set(rawCredit, existing.id)
      return existing.id
    }

    // Slug collision with an existing user (regardless of kind)
    const slugConflict = await db.query.users.findFirst({
      where: (u, { sql }) => sql`lower(${u.username}) = lower(${entry.handle})`,
    })
    if (slugConflict) {
      throw new Error(
        `Slug '${entry.handle}' (from ${source}/credits.json) collides with existing user id=${slugConflict.id}`,
      )
    }

    const id = newResourceId()
    await db.insert(schema.users).values({
      id,
      discordId: sentinelDiscordId,
      username: entry.handle,
      kind: entry.kind,
      profileUrl: entry.profileUrl ?? null,
      profileVisibility: 'public',
    })
    cache.set(rawCredit, id)
    return id
  }
}
