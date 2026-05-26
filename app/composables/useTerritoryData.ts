import type { TerritoryEntry } from '~/types/map'

const TERRITORY_PATH = '/cache/get/territoryList'
const CACHE_TTL = 5 * 60 * 1000

interface RawTerritory {
  guild: { name: string, prefix: string, color: string, uuid: string } | null
  acquired: string | null
  location: { start: [number, number], end: [number, number] }
}

const cache: {
  data: TerritoryEntry[] | null
  fetchedAt: number
  pending: Promise<TerritoryEntry[]> | null
} = { data: null, fetchedAt: 0, pending: null }

function parseResponse(json: Record<string, RawTerritory>): TerritoryEntry[] {
  return Object.entries(json).map(([name, raw]) => {
    let startX = raw.location.start[0]
    let startZ = raw.location.start[1]
    let endX = raw.location.end[0]
    let endZ = raw.location.end[1]
    if (startX > endX)
      [startX, endX] = [endX, startX]
    if (startZ > endZ)
      [startZ, endZ] = [endZ, startZ]
    return {
      name,
      guild: raw.guild
        ? { name: raw.guild.name, prefix: raw.guild.prefix, color: raw.guild.color }
        : null,
      acquired: raw.acquired,
      startX,
      startZ,
      endX,
      endZ,
    }
  })
}

async function fetchTerritories(): Promise<TerritoryEntry[]> {
  try {
    const { public: cfg } = useRuntimeConfig()
    const res = await fetch(`${cfg.athenaUrl}${TERRITORY_PATH}`)
    if (!res.ok)
      throw new Error(`territory fetch failed: ${res.status}`)
    const json = (await res.json()) as Record<string, RawTerritory>
    const data = parseResponse(json)
    cache.data = data
    cache.fetchedAt = Date.now()
    return data
  }
  finally {
    cache.pending = null
  }
}

export function getGuildTerritoryCount(guildName: string): number {
  return cache.data?.filter(t => t.guild?.name === guildName).length ?? 0
}

export async function ensureTerritoryData(): Promise<TerritoryEntry[]> {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL)
    return cache.data
  if (cache.pending)
    return cache.pending
  cache.pending = fetchTerritories()
  return cache.pending
}
