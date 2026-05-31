import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/global.css'],
  runtimeConfig: {
    public: {
      // Override at runtime with NUXT_PUBLIC_CDN_BASE_URL.
      // Root base: versions.json lives at the root; snapshots under data/{hash}/.
      cdnBaseUrl: 'https://cdn.wynn.tools/',
      athenaUrl: 'https://athena.wynntils.com',
      apiBaseUrl: 'https://api.wynn.tools',
    },
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      script: [
        {
          // Pre-paint: apply the saved (or system) theme before first paint so
          // light-theme users never flash the dark default. Mirrors useTheme.
          tagPosition: 'head',
          innerHTML:
            'try{var p=localStorage.getItem(\'wynn:theme\')||\'dark\';var r=p===\'system\'?(matchMedia(\'(prefers-color-scheme: dark)\').matches?\'dark\':\'light\'):p;document.documentElement.dataset.theme=r}catch(e){}',
        },
      ],
    },
  },
  modules: ['@nuxt/eslint', 'reka-ui/nuxt', '@pinia/nuxt', '@nuxt/fonts', 'nuxt-og-image', '@nuxt/icon'],
  ogImage: {
    defaults: {
      cacheMaxAgeSeconds: 60 * 60 * 24 * 365, // 1 year — OG images are immutable once generated
    },
    // Takumi is the only renderer (satori + @resvg/* are uninstalled). Our OG
    // components are *.takumi.vue; this flag is an explicit guard so the satori
    // binding stays off even if the package is ever re-added as a transitive dep.
    // Takumi renders pixel art crisply (nearest-neighbour) and decodes the webp
    // item icons natively — both of which the satori + resvg path could not do.
    compatibility: {
      dev: { satori: false },
      runtime: { satori: false },
      prerender: { satori: false },
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: {
    families: [
      { name: 'Barlow Semi Condensed', weights: [400, 500, 600, 700, 800], global: true },
      { name: 'Figtree', weights: [300, 400, 500, 600, 700], global: true },
      { name: 'Geist Mono', weights: [400, 500], global: true },
      // Wynncraft pixel font for the OG image (Satori) renderer. Fresh family
      // name; the file is public/fonts/wynncraftog-400.ttf — the `-400` weight
      // token is required for @nuxt/fonts + og-image to resolve the local file,
      // and it MUST be TrueType (glyf) outlines: Satori silently fails to render
      // CFF/OTTO OpenType fonts, so the source .otf was converted to .ttf.
      // global:true is REQUIRED — nuxt-og-image only ingests @nuxt/fonts
      // families that emit a global @font-face. Harmless on the web: no UI CSS
      // references 'WynncraftOg' (the chrome uses the 'wynncraft' woff face), so
      // browsers never fetch the .ttf; it only feeds the OG image renderer.
      { name: 'WynncraftOg', provider: 'local', weights: [400], global: true },
    ],
  },
})
