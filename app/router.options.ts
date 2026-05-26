import type { RouterConfig } from '@nuxt/schema'

/**
 * Custom scroll behavior. Editing a build calls router.replace('/builder/<newHash>')
 * to keep the URL in sync — that's a route-param change, which by default scrolls to
 * the top. Suppress scrolling when navigating within the builder (same route) so
 * toggling atree nodes / editing gear doesn't jump the page.
 */
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    const isBuilder = (p: string) => p.startsWith('/builder/')
    if (isBuilder(to.path) && isBuilder(from.path))
      return false
    return savedPosition ?? { left: 0, top: 0 }
  },
}
