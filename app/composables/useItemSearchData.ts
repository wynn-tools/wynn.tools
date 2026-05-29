import type { SearchData } from '~/lib/items-search/load-search-data'
import { useCdnClient } from '~/composables/useBuildData'
import { loadSearchData } from '~/lib/items-search/load-search-data'

export function useItemSearchData() {
  return useAsyncData<SearchData>('item-search-data', () => loadSearchData(useCdnClient()), { server: false })
}
