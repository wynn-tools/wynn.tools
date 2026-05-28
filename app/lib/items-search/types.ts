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
  icon?: unknown
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
