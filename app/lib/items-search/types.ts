import type { DamageRange, IdentificationEntry, MajorId, NormalizedText, OutputItem } from '~/lib/data/cdn-adapter/item-adapter'

export type IdRange = IdentificationEntry // { min, max, raw }

export interface SearchItem {
  id: number
  name: string
  displayName: string
  type: 'weapon' | 'armour' | 'accessory'
  subType: string
  tier: string
  level: number
  requirements: OutputItem['requirements']
  powderSlots: number
  restriction: string | null
  dropRestriction: string
  attackSpeed: string | null
  majorIds: MajorId[]
  base: Record<string, DamageRange | number>
  identifications: Record<string, IdRange>
  lore: NormalizedText[] | null
  set: string | null
  sets: string[]
  emblem: string | null
  averageDps: number | null
  elements: string[]
  icon?: unknown
}

export interface PositionModifiers {
  above: number
  under: number
  left: number
  right: number
  touching: number
  notTouching: number
}

export interface SearchIngredient {
  id: number
  name: string
  displayName: string
  tier: number
  level: number
  skills: string[]
  identifications: Record<string, IdRange>
  itemOnlyIDs: Record<string, number>
  consumableOnlyIDs: Record<string, number>
  positionModifiers: PositionModifiers
  icon?: unknown
}

export interface IdFilter {
  key: string
  exclude: boolean
}

export interface IdSort {
  key: string
  dir: 'asc' | 'desc'
}

export interface ItemCriteria {
  name: string
  types: string[]
  tiers: string[]
  sets: string[]
  levelRange: [number, number]
  restrictions: string[]
  majorId: string | null
  identifications: IdFilter[]
  idSorts: IdSort[]
}

export interface IngredientCriteria {
  name: string
  tiers: number[]
  levelRange: [number, number]
  skills: string[]
  identifications: IdFilter[]
  idSorts: IdSort[]
}
