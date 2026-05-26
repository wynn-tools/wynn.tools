import { onUnmounted, ref } from 'vue'

export interface PlayerLocation {
  username: string
  uuid: string
  x: number
  z: number
  health: number // -1 = unknown (Wynncraft API source)
  maxHealth: number
  server?: string
  isSelf: boolean
  isPartyMember: boolean
  isMutualFriend: boolean
  isGuildMember: boolean
}

// ── Hades (io.wynntils.com) ──────────────────────────────────────────────────

interface HadesOther {
  username: string
  uuid: string
  x: number
  z: number
  health: number
  maxHealth: number
  isPartyMember: boolean
  isMutualFriend: boolean
  isGuildMember: boolean
}

interface HadesResponse {
  username: string
  uuid: string
  x: number
  z: number
  health: number
  maxHealth: number
  otherPlayers?: HadesOther[]
}

async function fetchHades(): Promise<PlayerLocation[]> {
  const res = await fetch('https://io.wynntils.com/api/getMyLocation')
  if (res.status === 404)
    return [] // not a Wynntils user
  if (!res.ok)
    throw new Error(`Hades HTTP ${res.status}`)
  const data: HadesResponse = await res.json()
  return [
    {
      username: data.username,
      uuid: data.uuid,
      x: data.x,
      z: data.z,
      health: data.health,
      maxHealth: data.maxHealth,
      isSelf: true,
      isPartyMember: false,
      isMutualFriend: false,
      isGuildMember: false,
    },
    ...(data.otherPlayers ?? []).map(p => ({
      username: p.username,
      uuid: p.uuid,
      x: p.x,
      z: p.z,
      health: p.health,
      maxHealth: p.maxHealth,
      isSelf: false,
      isPartyMember: p.isPartyMember,
      isMutualFriend: p.isMutualFriend,
      isGuildMember: p.isGuildMember,
    })),
  ]
}

// ── Wynncraft API (api.wynncraft.com) ────────────────────────────────────────

interface WynEntry {
  uuid: string
  name: string
  nickname?: string
  server: string
  x: number
  y: number
  z: number
}

type WynResponse = Array<
  WynEntry & {
    friends: WynEntry[]
    party: WynEntry[]
    guild: WynEntry[]
  }
>

function wynEntryToLocation(
  entry: WynEntry,
  flags: {
    isSelf?: boolean
    isPartyMember?: boolean
    isMutualFriend?: boolean
    isGuildMember?: boolean
  },
): PlayerLocation {
  return {
    username: entry.name,
    uuid: entry.uuid,
    x: entry.x,
    z: entry.z,
    health: -1,
    maxHealth: 0,
    server: entry.server,
    isSelf: flags.isSelf ?? false,
    isPartyMember: flags.isPartyMember ?? false,
    isMutualFriend: flags.isMutualFriend ?? false,
    isGuildMember: flags.isGuildMember ?? false,
  }
}

const RATE_LIMIT_LOW_WATERMARK = 5
const DEFAULT_POLL_MS = 15_000

function nextPollDelayMs(res: Response): number {
  // Back off until reset when running low on the MAP bucket quota
  const remaining = Number(res.headers.get('ratelimit-remaining'))
  const reset = Number(res.headers.get('ratelimit-reset'))
  if (!Number.isNaN(remaining) && remaining <= RATE_LIMIT_LOW_WATERMARK && reset > 0)
    return reset * 1000

  // Honour the route's cache TTL so we never fetch stale data
  const cc = res.headers.get('Cache-Control')
  if (cc) {
    const m = /max-age=(\d+)/.exec(cc)
    if (m)
      return Number(m[1]) * 1000
  }
  const expires = res.headers.get('Expires')
  if (expires) {
    const ms = new Date(expires).getTime() - Date.now()
    if (ms > 0)
      return ms
  }

  return DEFAULT_POLL_MS
}

interface WynResult {
  players: PlayerLocation[]
  delayMs: number
}

async function fetchWynncraft(): Promise<WynResult> {
  const res = await fetch('https://api.wynncraft.com/v3/map/locations/player')
  if (!res.ok)
    throw new Error(`Wynncraft API HTTP ${res.status}`)
  const delayMs = nextPollDelayMs(res)
  const data: WynResponse = await res.json()
  if (!data.length)
    return { players: [], delayMs }

  const self = data[0]
  // Accumulate flags per UUID so a player in multiple lists gets all their flags
  const byUuid = new Map<string, PlayerLocation>()

  const upsert = (
    entry: WynEntry,
    flags: {
      isSelf?: boolean
      isPartyMember?: boolean
      isMutualFriend?: boolean
      isGuildMember?: boolean
    },
  ) => {
    const existing = byUuid.get(entry.uuid)
    if (existing) {
      if (flags.isPartyMember)
        existing.isPartyMember = true
      if (flags.isMutualFriend)
        existing.isMutualFriend = true
      if (flags.isGuildMember)
        existing.isGuildMember = true
    }
    else {
      byUuid.set(entry.uuid, wynEntryToLocation(entry, flags))
    }
  }

  upsert(self, { isSelf: true })
  for (const p of self.friends) upsert(p, { isMutualFriend: true })
  for (const p of self.party) upsert(p, { isPartyMember: true })
  for (const p of self.guild) upsert(p, { isGuildMember: true })

  return { players: [...byUuid.values()], delayMs }
}

// ── Merge ────────────────────────────────────────────────────────────────────
// Hades takes priority per UUID (has health data). Wynncraft API fills in
// players not tracked by Wynntils.

function merge(hades: PlayerLocation[], wyn: PlayerLocation[]): PlayerLocation[] {
  const out = new Map<string, PlayerLocation>()
  for (const p of hades) out.set(p.uuid, p)
  for (const p of wyn) {
    if (!out.has(p.uuid))
      out.set(p.uuid, p)
  }
  return [...out.values()]
}

// ── Composable ───────────────────────────────────────────────────────────────

export function usePlayerLocations() {
  const players = ref<PlayerLocation[]>([])
  let timerId: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  const BACKOFF_MS = 30_000

  async function poll() {
    const [hadesResult, wynResult] = await Promise.allSettled([fetchHades(), fetchWynncraft()])

    if (destroyed)
      return

    const hadesPlayers = hadesResult.status === 'fulfilled' ? hadesResult.value : []
    const wynPlayers = wynResult.status === 'fulfilled' ? wynResult.value.players : []

    players.value = merge(hadesPlayers, wynPlayers)

    const bothFailed = hadesResult.status === 'rejected' && wynResult.status === 'rejected'
    if (bothFailed) {
      schedule(BACKOFF_MS)
      return
    }

    const delayMs = wynResult.status === 'fulfilled' ? wynResult.value.delayMs : DEFAULT_POLL_MS
    schedule(delayMs)
  }

  function schedule(delay: number) {
    if (destroyed)
      return
    timerId = setTimeout(poll, delay)
  }

  poll()

  onUnmounted(() => {
    destroyed = true
    if (timerId !== null)
      clearTimeout(timerId)
  })

  return { players }
}
