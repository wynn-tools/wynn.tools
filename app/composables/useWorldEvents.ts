import type { CdnClient } from '~/lib/data/cdn-client'
import type { IngredientRef, ItemRef } from '~/lib/world-events/join'
import type { JoinedWorldEvent, WorldEventLootMap } from '~/lib/world-events/types'
import type { WorldEvent } from '~/types/map'
import { computed, ref, shallowRef } from 'vue'
import { resolveLatestVersion } from '~/composables/useBuildData'
import { cdnPathFor } from '~/lib/data/cdn-adapter/version-paths'
import { createCdnClient } from '~/lib/data/cdn-client'
import { joinWorldEvents } from '~/lib/world-events/join'
import { loadWorldEventLoot } from '~/lib/world-events/load-loot'

const REFRESH_MS = 120_000
const PATH = '/cache/get/worldEvents'

const events = ref<WorldEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loot = shallowRef<WorldEventLootMap>({})
const ingredients = shallowRef<Map<string, IngredientRef>>(new Map())
const items = shallowRef<Map<string, ItemRef>>(new Map())
const joinReady = ref(false)

let initialized = false
let athenaUrl = ''
let cdnClient: CdnClient | null = null

async function fetchEvents() {
  try {
    loading.value = true
    error.value = null
    const res = await fetch(`${athenaUrl}${PATH}`)
    if (!res.ok)
      throw new Error(`HTTP ${res.status}`)
    events.value = (await res.json()) as WorldEvent[]
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load events'
  }
  finally {
    loading.value = false
  }
}

async function loadJoinSources() {
  if (!cdnClient)
    return
  try {
    loot.value = await loadWorldEventLoot(cdnClient)
  }
  catch {
    loot.value = {}
  }
  try {
    const { gameVersion } = await resolveLatestVersion(cdnClient)
    const ingFile = await cdnClient
      .fetchJson<{ ingredients: Array<{ name: string, tier: number, displayName?: string }> }>(cdnPathFor(gameVersion, 'ingredients.json'))
      .catch(() => ({ ingredients: [] }))
    const itemFile = await cdnClient
      .fetchJson<{ items: Array<{ name: string, rarity?: string, type?: string }> }>(cdnPathFor(gameVersion, 'items.json'))
      .catch(() => ({ items: [] }))
    ingredients.value = new Map(ingFile.ingredients.map(i => [i.name, { tier: i.tier, displayName: i.displayName }]))
    items.value = new Map(itemFile.items.map(i => [i.name, { rarity: i.rarity, type: i.type }]))
  }
  catch {
    /* leave the maps empty; resolved drops degrade to plain names */
  }
  finally {
    joinReady.value = true
  }
}

function initialize() {
  if (initialized)
    return
  initialized = true
  const { public: cfg } = useRuntimeConfig()
  athenaUrl = cfg.athenaUrl as string
  cdnClient = createCdnClient(cfg.cdnBaseUrl as string)
  fetchEvents()
  loadJoinSources()
  setInterval(fetchEvents, REFRESH_MS)
}

export function useWorldEvents() {
  initialize()
  return { events, loading, error }
}

export function useJoinedWorldEvents() {
  initialize()
  const joined = computed<JoinedWorldEvent[]>(() => {
    if (!joinReady.value)
      return []
    return joinWorldEvents(events.value, loot.value, ingredients.value, items.value, (name) => {
      if (import.meta.dev)
        console.warn(`[world-events] loot entry "${name}" has no matching API event`)
    })
  })
  return { joined, loading, error }
}

export function useWorldEvent(slug: string) {
  const { joined } = useJoinedWorldEvents()
  return computed(() => joined.value.find(j => j.slug === slug))
}
