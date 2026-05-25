export type TomeType
  = | 'weaponTome' | 'armorTome' | 'guildTome' | 'lootrunTome'
    | 'gatherXpTome' | 'dungeonXpTome' | 'mobXpTome'

/** Tome stat fields keyed by stat id (open record; the math milestone interprets them). */
export type TomeStats = Record<string, number | string>

/** Loose tome as delivered by the CDN / source data. */
export interface RawTome {
  name: string
  displayName?: string
  id?: number
  type: TomeType
  tier?: string
  lvl?: number
  remapID?: number
  [key: string]: unknown
}

/** Normalized typed tome. */
export interface Tome {
  name: string
  displayName: string
  id: number
  type: TomeType
  tier: string
  level: number
  stats: TomeStats
}

export interface RawTomeData {
  tomes: RawTome[]
}
