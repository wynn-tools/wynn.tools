import type { CdnClient } from '~/lib/data/cdn-client'
import type { ItemSourcesFile } from '~/lib/item-sources/types'
import { ref, shallowRef } from 'vue'
import { createCdnClient } from '~/lib/data/cdn-client'
import { loadItemSources } from '~/lib/item-sources/load'

const sources = shallowRef<ItemSourcesFile>({ items: {} })
const ready = ref(false)
let initialized = false
let cdnClient: CdnClient | null = null

async function load() {
  if (!cdnClient)
    return
  try {
    sources.value = await loadItemSources(cdnClient)
  }
  catch {
    sources.value = { items: {} }
  }
  finally {
    ready.value = true
  }
}

function initialize() {
  if (initialized)
    return
  initialized = true
  const { public: cfg } = useRuntimeConfig()
  cdnClient = createCdnClient(cfg.cdnBaseUrl as string)
  load()
}

export function useItemSources() {
  initialize()
  return { sources, ready }
}
