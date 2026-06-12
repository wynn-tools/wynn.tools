import type { WorldEvent } from '~/types/map'

export interface DropEntryWithNote { name: string, note: string | null }

export interface WorldEventDrops {
  commonIngredients: string[]
  possibleIngredients: string[]
  exclusiveIngredients: string[]
  exclusiveItems: string[]
  rareMobDrops: string[]
  rareRandomLoots: DropEntryWithNote[]
}

export interface WorldEventLoot {
  region: string
  countdown: string
  delay: string
  drops: WorldEventDrops
}

export type WorldEventLootMap = Record<string, WorldEventLoot>

/** Resolved entry: a raw name, plus the ingredient or item it points at if found. */
export interface ResolvedDrop {
  name: string
  /** present iff the name resolves to an ingredient in the current snapshot */
  ingredient?: { tier: number, displayName?: string }
  /** present iff the name resolves to an item in the current snapshot */
  item?: { rarity?: string, type?: string }
  /** freeform note (rareRandomLoots only) */
  note?: string | null
}

export interface ResolvedDrops {
  commonIngredients: ResolvedDrop[]
  possibleIngredients: ResolvedDrop[]
  exclusiveIngredients: ResolvedDrop[]
  exclusiveItems: ResolvedDrop[]
  rareMobDrops: ResolvedDrop[]
  rareRandomLoots: ResolvedDrop[]
}

export interface JoinedWorldEvent {
  event: WorldEvent
  slug: string
  loot: WorldEventLoot | null
  resolved: ResolvedDrops | null
}

export interface WorldEventFilter {
  search: string
  regions: string[]
  difficulties: Array<'EASY' | 'MEDIUM' | 'HARD'>
  lengths: Array<'SHORT' | 'MEDIUM' | 'LONG'>
  levelMin: number
  levelMax: number
  dropsIngredient: string | null
  dropsExclusiveItem: string | null
  hasSchedule: boolean
}

export type WorldEventSort = 'level' | 'name' | 'nextSpawn'
