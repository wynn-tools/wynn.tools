// Toggles html[data-play] based on route path so the Wynncraft Journey token
// override in global.css (:root[data-play='true']) takes effect across every
// /play/* page and nowhere else. Mirrors the existing theme system's data
// attribute pattern. The pre-paint script in nuxt.config sets the attribute
// before first paint to avoid an envelope flash on cold load.

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client)
    return
  const inPlay = to.path === '/play' || to.path.startsWith('/play/')
  const html = document.documentElement
  if (inPlay)
    html.dataset.play = 'true'
  else
    delete html.dataset.play
})
