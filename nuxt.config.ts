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
      // Wynncraft pixel font for the OG image (Takumi) renderer. Fresh family
      // name + matching public/fonts/wynncraftog.otf so @nuxt/fonts' local
      // provider resolves it (the 'wynncraft' family is skipped because
      // global.css already declares its @font-face). global:false — web keeps
      // using the woff @font-face.
      { name: 'WynncraftOg', provider: 'local', weights: [400], global: false },
    ],
  },
})
