import type { NoriClient } from './nori'
import type { WeightProfile } from './weight-types'
import type { WynnpoolClient } from './wynnpool'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

export interface ProviderResult {
  profiles: WeightProfile[]
}
export interface WeightsResult {
  nori: ProviderResult | null
  wynnpool: ProviderResult | null
  fetchedAt: string
}

const DEFAULT_TTL_MS = 24 * 60 * 60_000

export async function getCachedWeights(
  itemName: string,
  encoded: string,
  clients: { nori: NoriClient, wynnpool: WynnpoolClient },
  opts: { ttlMs: number } = { ttlMs: DEFAULT_TTL_MS },
): Promise<WeightsResult> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.weightCache)
    .where(eq(schema.weightCache.itemName, itemName))
    .limit(1)
  if (row && Date.now() - row.fetchedAt.getTime() < opts.ttlMs) {
    return {
      nori: (row.nori as ProviderResult | null) ?? null,
      wynnpool: (row.wynnpool as ProviderResult | null) ?? null,
      fetchedAt: row.fetchedAt.toISOString(),
    }
  }
  const [noriR, wynnpoolR] = await Promise.allSettled([
    clients.nori.fetchWeights(encoded),
    clients.wynnpool.fetchWeights(itemName),
  ])
  const nori = noriR.status === 'fulfilled' ? { profiles: noriR.value } : null
  const wynnpool
    = wynnpoolR.status === 'fulfilled' ? { profiles: wynnpoolR.value } : null
  if (!nori && !wynnpool && row) {
    return {
      nori: (row.nori as ProviderResult | null) ?? null,
      wynnpool: (row.wynnpool as ProviderResult | null) ?? null,
      fetchedAt: row.fetchedAt.toISOString(),
    }
  }
  const now = new Date()
  await db
    .insert(schema.weightCache)
    .values({ itemName, nori, wynnpool, fetchedAt: now })
    .onConflictDoUpdate({
      target: schema.weightCache.itemName,
      set: { nori, wynnpool, fetchedAt: now },
    })
  return { nori, wynnpool, fetchedAt: now.toISOString() }
}
