import type { CdnClient } from '~/lib/data/cdn-client'
import type { SearchIngredient, SearchItem } from '~/lib/items-search/types'
import type { JoinedWorldEvent, WorldEventLootMap } from '~/lib/world-events/types'
import type { WorldEvent } from '~/types/map'
import { computed, ref, shallowRef } from 'vue'
import { useItemSearchData } from '~/composables/useItemSearchData'
import { createCdnClient } from '~/lib/data/cdn-client'
import { joinWorldEvents } from '~/lib/world-events/join'
import { loadWorldEventLoot } from '~/lib/world-events/load-loot'

const REFRESH_MS = 120_000
const PATH = '/cache/get/worldEvents'

const events = ref<WorldEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loot = shallowRef<WorldEventLootMap>({})
const lootReady = ref(false)

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

async function loadLoot() {
  if (!cdnClient)
    return
  try {
    loot.value = await loadWorldEventLoot(cdnClient)
  }
  catch {
    loot.value = {}
  }
  finally {
    lootReady.value = true
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
  loadLoot()
  setInterval(fetchEvents, REFRESH_MS)
}

export function useWorldEvents() {
  initialize()
  return { events, loading, error }
}

export function useJoinedWorldEvents() {
  initialize()
  const { data: searchData } = useItemSearchData()
  const ingredientMap = computed(() => new Map<string, SearchIngredient>(
    (searchData.value?.ingredients ?? []).map(i => [i.name, i]),
  ))
  const itemMap = computed(() => new Map<string, SearchItem>(
    (searchData.value?.items ?? []).map(i => [i.name, i]),
  ))
  const joined = computed<JoinedWorldEvent[]>(() => {
    if (!lootReady.value)
      return []
    return joinWorldEvents(events.value, loot.value, ingredientMap.value, itemMap.value, (name) => {
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

export function useWorldEventLoot() {
  initialize()
  return { loot, ready: lootReady }
}
