// Keeps theme state in sync after hydration (the pre-paint script in
// nuxt.config has already set html[data-theme] to avoid a flash).
export default defineNuxtPlugin(() => {
  useTheme().init()
})
