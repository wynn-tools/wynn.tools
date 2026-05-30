import type { WorldEvent } from '~/types/map'
import { ref } from 'vue'

const REFRESH_MS = 120_000
const PATH = '/cache/get/worldEvents'

const events = ref<WorldEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let initialized = false
let athenaUrl = ''

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

export function useWorldEvents() {
  if (!initialized) {
    initialized = true
    const { public: cfg } = useRuntimeConfig()
    athenaUrl = cfg.athenaUrl as string
    fetchEvents()
    setInterval(fetchEvents, REFRESH_MS)
  }
  return { events, loading, error }
}
