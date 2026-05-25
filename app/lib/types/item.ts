export type ItemCategory = 'armor' | 'accessory' | 'weapon'

export type ItemType
  = | 'helmet' | 'chestplate' | 'leggings' | 'boots'
    | 'ring' | 'bracelet' | 'necklace'
    | 'dagger' | 'wand' | 'bow' | 'spear' | 'relik'

export type ItemTier
  = | 'Normal' | 'Unique' | 'Rare' | 'Legendary'
    | 'Fabled' | 'Mythic' | 'Set' | 'Crafted'

/** Build requirements, normalized from the raw `*Req` fields. */
export interface Requirements {
  level: number
  strength: number
  dexterity: number
  intelligence: number
  defence: number
  agility: number
  class: string | null
  quest: string | null
}

/**
 * Item stat fields keyed by stat id (e.g. `mr`, `sdRaw`, `aDef`, `nDam`).
 * Modeled as an open record on purpose: Wynncraft adds/changes stat ids each
 * patch, so a closed union would be wrong. The math layer (milestone 3) adds
 * typed accessors over this record.
 */
export type ItemStats = Record<string, number | string>

/** Loose shape of a single item as delivered by the CDN / source data. */
export interface RawItem {
  name: string
  displayName?: string
  id?: number
  category: ItemCategory
  type: ItemType
  tier?: string
  lvl?: number
  slots?: number
  drop?: string
  armourMaterial?: string
  lore?: string
  icon?: unknown
  set?: string | null
  remapID?: number
  strReq?: number
  dexReq?: number
  intReq?: number
  defReq?: number
  agiReq?: number
  classReq?: string
  quest?: string | null
  [key: string]: unknown
}

/** Normalized, typed domain item. */
export interface Item {
  name: string
  displayName: string
  id: number
  category: ItemCategory
  type: ItemType
  tier: ItemTier
  level: number
  slots: number
  requirements: Requirements
  armourMaterial: string | null
  drop: string
  lore: string
  set: string | null
  stats: ItemStats
}

export interface ItemSet {
  items: string[]
  bonuses: Array<Record<string, number>>
}

/** Raw top-level data payload (item list + named sets). */
export interface RawItemData {
  items: RawItem[]
  sets: Record<string, ItemSet>
}
