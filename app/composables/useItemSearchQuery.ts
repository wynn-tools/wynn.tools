import type { ItemCriteria } from '~/lib/items-search/types'
import { itemCriteriaToQuery, queryToItemCriteria } from '~/lib/items-search/criteria-url'

export function useItemSearchQuery() {
  const route = useRoute()
  const router = useRouter()
  const criteria = ref<ItemCriteria>(queryToItemCriteria(route.query as Record<string, string>))

  let handle: ReturnType<typeof setTimeout> | null = null
  watch(criteria, (c) => {
    if (handle)
      clearTimeout(handle)
    handle = setTimeout(() => {
      router.replace({ query: itemCriteriaToQuery(c) })
    }, 250)
  }, { deep: true })

  return { criteria }
}
