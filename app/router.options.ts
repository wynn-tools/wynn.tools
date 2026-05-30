import type { RouterConfig } from '@nuxt/schema'

/**
 * Custom scroll behavior. In-page controls keep the URL in sync via
 * router.replace — editing a build replaces the path (`/builder/<newHash>`),
 * while controls like the boost panel and mana calculator replace only the
 * query. Neither should jump the page. Suppress scrolling for same-path
 * navigations (query-only state sync) and for movement within the builder.
 */
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // Query/hash-only updates on the same path are state sync, not navigation.
    if (to.path === from.path)
      return false
    const isBuilder = (p: string) => p.startsWith('/builder/')
    if (isBuilder(to.path) && isBuilder(from.path))
      return false
    return savedPosition ?? { left: 0, top: 0 }
  },
}
