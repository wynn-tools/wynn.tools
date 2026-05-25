import type { RawTome, RawTomeData, Tome, TomeStats, TomeType } from '../types/tome'

const META_KEYS = new Set(['name', 'displayName', 'id', 'type', 'tier', 'lvl', 'remapID'])

/** none-tome definitions [type, name, id] from load_tome.js init_maps. */
const NONE_TOME_DEFS: Array<[TomeType, string, number]> = [
  ['weaponTome', 'No Weapon Tome', 61],
  ['armorTome', 'No Armor Tome', 62],
  ['guildTome', 'No Guild Tome', 63],
  ['lootrunTome', 'No Lootrun Tome', 93],
  ['gatherXpTome', 'No Marathon Tome', 162],
  ['dungeonXpTome', 'No Mysticism Tome', 163],
  ['mobXpTome', 'No Expertise Tome', 164],
]

export const NONE_TOMES: Tome[] = NONE_TOME_DEFS.map(([type, name, id]) => ({
  name,
  displayName: name,
  id,
  type,
  tier: 'Normal',
  level: 0,
  stats: {},
}))

function adaptTome(raw: RawTome): Tome {
  if (raw.id === undefined || raw.id === null)
    throw new Error(`Tome "${raw.name}" is missing a stable id`)

  const stats: TomeStats = {}
  for (const [key, value] of Object.entries(raw)) {
    if (META_KEYS.has(key))
      continue
    if (typeof value === 'number' || typeof value === 'string')
      stats[key] = value
  }
  return {
    name: raw.name,
    displayName: raw.displayName ?? raw.name,
    id: raw.id,
    type: raw.type,
    tier: raw.tier ?? 'Normal',
    level: raw.lvl ?? 0,
    stats,
  }
}

export interface TomeDb {
  tomes: Tome[]
  byName: Map<string, Tome>
  byId: Map<number, Tome>
  resolveId: (id: number) => Tome | undefined
}

export function buildTomeDb(data: RawTomeData): TomeDb {
  const byName = new Map<string, Tome>()
  const byId = new Map<number, Tome>()
  const redirects = new Map<number, number>()
  const tomes: Tome[] = []

  for (const raw of data.tomes) {
    if (raw.remapID !== undefined && raw.id !== undefined) {
      redirects.set(raw.id, raw.remapID)
      continue
    }
    const tome = adaptTome(raw)
    tomes.push(tome)
    byName.set(tome.displayName, tome)
    byId.set(tome.id, tome)
  }

  for (const none of NONE_TOMES) {
    tomes.push(none)
    byId.set(none.id, none)
  }

  function resolveId(id: number): Tome | undefined {
    let current = id
    const seen = new Set<number>()
    while (redirects.has(current)) {
      if (seen.has(current))
        return undefined
      seen.add(current)
      current = redirects.get(current)!
    }
    return byId.get(current)
  }

  return { tomes, byName, byId, resolveId }
}
