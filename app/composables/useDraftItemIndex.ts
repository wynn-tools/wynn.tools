import type { SearchItem } from '~/lib/items-search/types'
import { computed } from 'vue'

/**
 * id → SearchItem lookup over the shared, cached item-search dataset. Because
 * `useItemSearchData` is keyed (`item-search-data`), every caller reads the same
 * data, so the rail and result cards resolve names/icons/rarity consistently.
 */
export function useDraftItemIndex() {
  const { data } = useItemSearchData()

  const index = computed(() => {
    const m = new Map<number, SearchItem>()
    for (const it of data.value?.items ?? [])
      m.set(it.id, it)
    return m
  })

  const gameVersion = computed(() => data.value?.gameVersion ?? null)

  return { index, gameVersion }
}
