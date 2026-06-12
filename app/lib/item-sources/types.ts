export type SourceType
  = | 'specificMobDrop' | 'normalMobDrop' | 'miniboss'
    | 'merchant' | 'dungeonMerchant'
    | 'quest'
    | 'worldEvent' | 'raid' | 'dungeon' | 'mobDropRegion'
    | 'caveCompletion' | 'tinkering' | 'forgeryChest' | 'lootChest'
    | 'gathering' | 'discovery' | 'environment' | 'event'
    | 'interaction' | 'unavailable'

export interface MerchantTrade {
  merchant: string
  inputs: Array<{ item: string, amount: number }>
}

export interface SourceEntry {
  type: SourceType
  name?: string
  wiki?: string
  level?: number
  health?: number
  location?: string
  combatLevel?: number
  npc?: string
  province?: string
  length?: string
  difficulty?: string
  experience?: string
  emeralds?: string
  trades?: MerchantTrade[]
}

export interface ItemSourcesFile {
  items: Record<string, SourceEntry[]>
}
