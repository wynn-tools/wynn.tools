import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

export interface PriceQuery {
  name: string
  tier?: number
  shiny?: boolean
}

export interface CacheOpts {
  ttlMs: number
}

interface Upstream {
  fetchPrice: (name: string, opts?: { tier?: number, shiny?: boolean }) => Promise<Record<string, unknown> | null>
}

const DEFAULT_TTL_MS = 15 * 60_000 // 15 minutes

export function priceKey(q: PriceQuery): string {
  return `${q.name.toLowerCase()}|${q.tier ?? ''}|${q.shiny ? 1 : 0}`
}

export async function getCachedPrice(
  q: PriceQuery,
  upstream: Upstream,
  opts: CacheOpts = { ttlMs: DEFAULT_TTL_MS },
): Promise<Record<string, unknown> | null> {
  const db = getDb()
  const key = priceKey(q)
  const [row] = await db.select().from(schema.marketPriceCache).where(eq(schema.marketPriceCache.key, key)).limit(1)

  if (row && Date.now() - row.fetchedAt.getTime() < opts.ttlMs)
    return (row.payload as Record<string, unknown> | null) ?? null

  let payload: Record<string, unknown> | null
  try {
    payload = await upstream.fetchPrice(q.name, { tier: q.tier, shiny: q.shiny })
  }
  catch (err) {
    // Upstream outage: prefer a stale cached value over surfacing the error.
    if (row)
      return (row.payload as Record<string, unknown> | null) ?? null
    throw err
  }

  await db.insert(schema.marketPriceCache)
    .values({ key, payload: payload ?? null, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.marketPriceCache.key,
      set: { payload: payload ?? null, fetchedAt: new Date() },
    })
  return payload ?? null
}

export async function getCachedPrices(
  queries: PriceQuery[],
  upstream: Upstream,
  opts: CacheOpts = { ttlMs: DEFAULT_TTL_MS },
): Promise<(Record<string, unknown> | null)[]> {
  const settled = await Promise.allSettled(queries.map(q => getCachedPrice(q, upstream, opts)))
  return settled.map(s => (s.status === 'fulfilled' ? s.value : null))
}
