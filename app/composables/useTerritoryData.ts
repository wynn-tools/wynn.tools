import type {
  TerritoryEntry,
  TerritoryRating,
  TerritoryResource,
  TerritoryResourceType,
} from '~/types/map'

const TERRITORY_PATH
  = '/cache/get/territoryList?show=links,treasury,defences,resources'
const CACHE_TTL = 5 * 60 * 1000

interface RawResource {
  type: TerritoryResourceType
  generation: number
  baseGeneration: number
  stored: number
  limit: number
}

interface RawTerritory {
  guild: {
    name: string
    prefix: string
    color: string
    uuid: string
    hq?: string | null
  } | null
  acquired: string | null
  location: { start: [number, number], end: [number, number] }
  hq?: boolean
  resources?: RawResource[]
  links?: string[]
  treasury?: TerritoryRating
  defences?: TerritoryRating
}

const cache: {
  data: TerritoryEntry[] | null
  byName: Map<string, TerritoryEntry>
  fetchedAt: number
  pending: Promise<TerritoryEntry[]> | null
} = { data: null, byName: new Map(), fetchedAt: 0, pending: null }

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
    const resources: TerritoryResource[] | undefined = raw.resources?.map(r => ({
      type: r.type,
      generation: r.generation,
      baseGeneration: r.baseGeneration,
      stored: r.stored,
      limit: r.limit,
    }))
    return {
      name,
      guild: raw.guild
        ? {
            name: raw.guild.name,
            prefix: raw.guild.prefix,
            color: raw.guild.color,
            hq: raw.guild.hq ?? null,
          }
        : null,
      acquired: raw.acquired,
      startX,
      startZ,
      endX,
      endZ,
      hq: raw.hq,
      resources,
      links: raw.links,
      treasury: raw.treasury,
      defences: raw.defences,
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
    cache.byName = new Map(data.map(t => [t.name, t]))
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

export function getTerritoryByName(name: string): TerritoryEntry | null {
  return cache.byName.get(name) ?? null
}

export async function ensureTerritoryData(): Promise<TerritoryEntry[]> {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL)
    return cache.data
  if (cache.pending)
    return cache.pending
  cache.pending = fetchTerritories()
  return cache.pending
}
