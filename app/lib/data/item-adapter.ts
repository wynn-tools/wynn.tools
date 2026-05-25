import type { Item, ItemCategory, ItemStats, ItemTier, ItemType, RawItem, Requirements } from '../types/item'

/** Raw keys that are item metadata, not stats. Everything else becomes a stat. */
const META_KEYS = new Set([
  'name',
  'displayName',
  'id',
  'category',
  'type',
  'tier',
  'lvl',
  'slots',
  'drop',
  'armourMaterial',
  'lore',
  'icon',
  'set',
  'remapID',
  'strReq',
  'dexReq',
  'intReq',
  'defReq',
  'agiReq',
  'classReq',
  'quest',
])

function toRequirements(raw: RawItem): Requirements {
  return {
    level: raw.lvl ?? 0,
    strength: raw.strReq ?? 0,
    dexterity: raw.dexReq ?? 0,
    intelligence: raw.intReq ?? 0,
    defence: raw.defReq ?? 0,
    agility: raw.agiReq ?? 0,
    class: raw.classReq ?? null,
    quest: raw.quest ?? null,
  }
}

function toStats(raw: RawItem): ItemStats {
  const stats: ItemStats = {}
  for (const [key, value] of Object.entries(raw)) {
    if (META_KEYS.has(key))
      continue
    if (typeof value === 'number' || typeof value === 'string')
      stats[key] = value
  }
  return stats
}

export function adaptItem(raw: RawItem): Item {
  if (raw.id === undefined || raw.id === null)
    throw new Error(`Item "${raw.name}" is missing a stable id (codec requires it)`)

  return {
    name: raw.name,
    displayName: raw.displayName ?? raw.name,
    id: raw.id,
    category: raw.category as ItemCategory,
    type: raw.type as ItemType,
    tier: (raw.tier ?? 'Normal') as ItemTier,
    level: raw.lvl ?? 0,
    slots: raw.slots ?? 0,
    requirements: toRequirements(raw),
    armourMaterial: raw.armourMaterial ?? null,
    drop: raw.drop ?? 'never',
    lore: raw.lore ?? '',
    set: raw.set ?? null,
    stats: toStats(raw),
  }
}
