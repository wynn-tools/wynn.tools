// Internal fallback for nuxt-og-image font loading on Cloudflare Pages.
//
// On Pages, `/fonts/*` is in `_routes.json` exclude, so external requests are
// served by the Pages static-asset edge — this handler never runs for browsers.
// But inside the worker, nuxt-og-image's CF binding does:
//   1. env.ASSETS.fetch(url)  — flaky from inside a Nitro sub-fetch
//   2. event.$fetch(path)     — without this handler, 404s and the font is dropped
// We satisfy step 2 by reading the TTF out of `assets:server` (bundled via
// `nitro.serverAssets` in nuxt.config), so the worker always has the bytes.
const ALLOW = new Set([
  'wynncraftog-400.ttf',
  'wynnfive-400.ttf',
])

export default defineEventHandler(async (event) => {
  const file = getRouterParam(event, 'file')!
  if (!ALLOW.has(file))
    throw createError({ statusCode: 404 })

  const data = await useStorage('assets:og-fonts').getItemRaw(file)
  if (!data)
    throw createError({ statusCode: 404 })

  setResponseHeader(event, 'content-type', 'font/ttf')
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return data
})
