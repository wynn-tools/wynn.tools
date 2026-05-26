export interface WorldPosition { x: number, y: number, z: number }

export type WorldId
  = | 'main'
    | 'void'
    | 'kos'
    | 'sandy'
    | 'wynnter'
    | 'apotheosis'
    | 'gateway'
    | 'deaths-realm'

export type LayerKind = '2d'

export interface TileSpec {
  name: string
  url: string
  bounds: { x1: number, z1: number, x2: number, z2: number }
}

export interface WorldConfig {
  id: WorldId
  label: string
  bounds: { x1: number, z1: number, x2: number, z2: number }
  tilePatterns: RegExp[] // applied against maps.json entry `name`
  nativeZoom: number
  minZoom: number
  maxZoom: number
}

export type MapCategoryId = string // `wynntils:place:city`, etc.

export interface MapCategory {
  id: MapCategoryId
  parentId: MapCategoryId | null
  label: string
  icon: string // /icons/map/*.png
  color: string // #RRGGBB
  defaultOn: boolean
  minZoom: number
  cluster: boolean
  virtual?: boolean // true for grouping-only parent rows with no map features
}

export interface MapFeature {
  featureId: string
  categoryId: MapCategoryId
  label: string
  location: WorldPosition
  level?: number
  description?: string
  rewards?: string[]
  length?: 'short' | 'medium' | 'long'
  difficulty?: 'easy' | 'medium' | 'hard'
  specialInfo?: string
  worldId?: WorldId // assigned at runtime by world tagging
}

export interface Lootrun {
  id?: string // server-assigned
  points: WorldPosition[]
  chests?: WorldPosition[]
  label?: string
  blockDistance?: number
  bbox?: { x1: number, z1: number, x2: number, z2: number }
  worldId?: WorldId
}

export interface ShareView {
  code?: string
  world: WorldId
  center: { x: number, z: number }
  zoom: number
  cats: MapCategoryId[]
  focus: string | null
  fs: boolean
  lootrunId?: string | null
  title?: string | null
}

export interface TerritoryEntry {
  name: string
  guild: { name: string, prefix: string, color: string } | null
  acquired: string | null
  startX: number
  startZ: number
  endX: number
  endZ: number
}
