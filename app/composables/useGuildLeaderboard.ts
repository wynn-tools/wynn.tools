import type { TerritoryEntry } from '~/types/map'

export interface GuildLbRow {
  rank: number
  name: string
  prefix: string
  level: number
  wars: number
  apiCount: number // Wynncraft API territory count
  liveCount: number // real-time count from athena
  color: string // from athena territory data
}

interface RawLbEntry {
  name: string
  prefix: string
  level: number
  wars: number
  territories: number
}

let cache: { data: GuildLbRow[] | null, fetchedAt: number } = { data: null, fetchedAt: 0 }
const CACHE_TTL = 5 * 60 * 1000

async function fetchLeaderboard(): Promise<RawLbEntry[]> {
  const res = await fetch('/api/wynncraft/v3/leaderboards/guildTerritories?resultLimit=15')
  if (!res.ok)
    throw new Error(`leaderboard fetch failed: ${res.status}`)
  const json = (await res.json()) as Record<string, RawLbEntry>
  return Object.values(json)
}

export async function buildGuildLeaderboard(territories: TerritoryEntry[]): Promise<GuildLbRow[]> {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL)
    return cache.data

  const raw = await fetchLeaderboard()

  // Build a color map and live count map from athena territory data
  const colorMap = new Map<string, string>()
  const liveCountMap = new Map<string, number>()
  for (const t of territories) {
    if (!t.guild)
      continue
    colorMap.set(t.guild.name, t.guild.color)
    liveCountMap.set(t.guild.name, (liveCountMap.get(t.guild.name) ?? 0) + 1)
  }

  const rows: GuildLbRow[] = raw.map((entry, i) => ({
    rank: i + 1,
    name: entry.name,
    prefix: entry.prefix,
    level: entry.level,
    wars: entry.wars,
    apiCount: entry.territories,
    liveCount: liveCountMap.get(entry.name) ?? 0,
    color: colorMap.get(entry.name) ?? '#888888',
  }))

  cache = { data: rows, fetchedAt: Date.now() }
  return rows
}

export function clearGuildLeaderboardCache() {
  cache = { data: null, fetchedAt: 0 }
}
